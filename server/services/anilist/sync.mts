// ============================================================================
// AniList → 自前 DB(Work / WorkTag / WorkRelation)へのバッチ同期ロジック。
//
// P0-3: ユーザーのアクセスごとに AniList を叩くのではなく、このロジックを
// scripts/sync-anilist.mts から定期的に(今は手動実行、将来的には P0-4 で
// cron/EventBridge から)実行して、作品マスターテーブルを更新するバッチ処理として
// 設計している。ページ表示時に AniList を直接呼び出す構造には絶対にしないこと。
// ============================================================================
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import type {
  Season,
  WorkCountry,
  WorkRelationType,
  WorkType,
} from '../../db/generated/prisma/enums.ts';
import { PrismaClient } from '../../db/generated/prisma/client.ts';
import { anilistRequest } from './client.mts';

// このスクリプト専用の PrismaClient。Next.js アプリ側の server/db/client.ts の
// シングルトン(ホットリロード対策のグローバルキャッシュ)はここでは不要なため、
// バッチ実行 1 回分として独立したインスタンスを持つ。
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// AniList の MediaType は ANIME/MANGA で、Prisma の WorkType とラベルが完全に一致する。
const SYNC_TYPES: WorkType[] = (process.env.ANILIST_SYNC_TYPES ?? 'ANIME,MANGA')
  .split(',')
  .map((t) => t.trim().toUpperCase())
  .filter((t): t is WorkType => t === 'ANIME' || t === 'MANGA');

// 同期対象の並び順・ページサイズ・最大ページ数(= 1回のバッチで同期する件数の上限)。
// AniList カタログ全体を毎回舐めるのは現実的でないため、まずは注目度の高い作品から
// 優先的に同期する運用を想定したデフォルト値にしている。
const SYNC_SORT = process.env.ANILIST_SYNC_SORT ?? 'TRENDING_DESC';
const SYNC_PER_PAGE = Number(process.env.ANILIST_SYNC_PER_PAGE ?? 50);
const SYNC_MAX_PAGES = Number(process.env.ANILIST_SYNC_MAX_PAGES ?? 3);

const MEDIA_PAGE_QUERY = `
query ($page: Int, $perPage: Int, $type: MediaType, $sort: [MediaSort]) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      hasNextPage
    }
    media(type: $type, sort: $sort) {
      id
      type
      title {
        romaji
        english
        native
      }
      genres
      tags {
        name
        rank
      }
      countryOfOrigin
      popularity
      averageScore
      trending
      season
      seasonYear
      episodes
      chapters
      volumes
      coverImage {
        large
      }
      relations {
        edges {
          relationType
          node {
            id
          }
        }
      }
    }
  }
}
`;

interface AniListMediaTitle {
  romaji: string | null;
  english: string | null;
  native: string | null;
}

interface AniListMediaTag {
  name: string;
  rank: number | null;
}

interface AniListRelationEdge {
  relationType: string;
  node: { id: number } | null;
}

interface AniListMedia {
  id: number;
  type: WorkType;
  title: AniListMediaTitle;
  genres: string[];
  tags: AniListMediaTag[] | null;
  countryOfOrigin: string | null;
  popularity: number | null;
  averageScore: number | null;
  trending: number | null;
  season: string | null;
  seasonYear: number | null;
  episodes: number | null;
  chapters: number | null;
  volumes: number | null;
  coverImage: { large: string | null } | null;
  relations: { edges: AniListRelationEdge[] } | null;
}

interface MediaPageResponse {
  Page: {
    pageInfo: { hasNextPage: boolean };
    media: AniListMedia[];
  };
}

// AniList の countryOfOrigin(ISO 3166-1 alpha-2)のうち、スキーマの WorkCountry
// enum に定義されている値だけをそのまま使い、それ以外は OTHER に丸める。
const KNOWN_COUNTRIES: ReadonlySet<string> = new Set(['JP', 'KR', 'CN', 'TW']);
function mapCountryOfOrigin(code: string | null): WorkCountry {
  return code && KNOWN_COUNTRIES.has(code) ? (code as WorkCountry) : 'OTHER';
}

const KNOWN_SEASONS: ReadonlySet<string> = new Set(['WINTER', 'SPRING', 'SUMMER', 'FALL']);
function mapSeason(season: string | null): Season | null {
  return season && KNOWN_SEASONS.has(season) ? (season as Season) : null;
}

/**
 * AniList の1件分の作品データを Work テーブルに upsert し、
 * WorkTag / WorkRelation を最新状態に置き換える。
 */
async function upsertWork(media: AniListMedia): Promise<void> {
  const data = {
    type: media.type,
    titleRomaji: media.title.romaji,
    titleEnglish: media.title.english,
    titleNative: media.title.native,
    genres: media.genres ?? [],
    countryOfOrigin: mapCountryOfOrigin(media.countryOfOrigin),
    season: mapSeason(media.season),
    seasonYear: media.seasonYear,
    episodes: media.episodes,
    chapters: media.chapters,
    volumes: media.volumes,
    coverImageUrl: media.coverImage?.large ?? null,
    // 参考情報としてのみ保存する(自サービスのランキング並び替えには絶対に使わない)。
    popularity: media.popularity,
    averageScore: media.averageScore,
    trending: media.trending,
  };

  const work = await prisma.work.upsert({
    where: { anilistId: media.id },
    create: { anilistId: media.id, ...data },
    update: data,
  });

  // タグは AniList 側のスナップショットが正なので、毎回全削除してから作り直す。
  await prisma.workTag.deleteMany({ where: { workId: work.id } });
  const tags = (media.tags ?? []).filter(
    (tag): tag is AniListMediaTag & { rank: number } => tag.rank !== null,
  );
  if (tags.length > 0) {
    await prisma.workTag.createMany({
      data: tags.map((tag) => ({ workId: work.id, name: tag.name, rank: tag.rank })),
      skipDuplicates: true,
    });
  }

  // relations も同様に全削除してから作り直す。対象作品(targetAnilistId)がまだ自前 DB に
  // 同期されていない場合は targetWorkId を null のままにしておき、後で対象作品が同期
  // された時点で(下の「未解決 relations の解決」で)自動的に紐づける。
  // このテーブルはそのまま P1-3(原作-アニメ-続編シリーズ接続機能)で使う想定。
  await prisma.workRelation.deleteMany({ where: { sourceWorkId: work.id } });
  const edges = media.relations?.edges ?? [];
  for (const edge of edges) {
    if (!edge.node) continue;
    const targetWork = await prisma.work.findUnique({ where: { anilistId: edge.node.id } });
    await prisma.workRelation.create({
      data: {
        sourceWorkId: work.id,
        targetAnilistId: edge.node.id,
        targetWorkId: targetWork?.id ?? null,
        relationType: edge.relationType as WorkRelationType,
      },
    });
  }

  // この作品自身が、既に同期済みの他作品の relations から「未解決(targetWorkId 未設定)」
  // のターゲットとして参照されている場合、ここで targetWorkId を埋める。
  await prisma.workRelation.updateMany({
    where: { targetAnilistId: media.id, targetWorkId: null },
    data: { targetWorkId: work.id },
  });
}

async function syncMediaType(type: WorkType): Promise<number> {
  let page = 1;
  let hasNextPage = true;
  let syncedCount = 0;

  while (hasNextPage && page <= SYNC_MAX_PAGES) {
    console.log(`[anilist] ${type} ページ ${page}/${SYNC_MAX_PAGES} を取得中...`);
    const result = await anilistRequest<MediaPageResponse>(MEDIA_PAGE_QUERY, {
      page,
      perPage: SYNC_PER_PAGE,
      type,
      sort: [SYNC_SORT],
    });

    for (const media of result.Page.media) {
      await upsertWork(media);
      syncedCount += 1;
    }

    hasNextPage = result.Page.pageInfo.hasNextPage;
    page += 1;
  }

  return syncedCount;
}

/** バッチ同期のエントリーポイント。ANILIST_SYNC_TYPES で指定した種別を順に同期する。 */
export async function runAniListSync(): Promise<void> {
  console.log(
    `[anilist] 同期開始: types=${SYNC_TYPES.join(',')} sort=${SYNC_SORT} perPage=${SYNC_PER_PAGE} maxPages=${SYNC_MAX_PAGES}`,
  );

  let total = 0;
  for (const type of SYNC_TYPES) {
    const count = await syncMediaType(type);
    console.log(`[anilist] ${type} 同期完了: ${count} 件`);
    total += count;
  }

  console.log(`[anilist] 全体同期完了: 合計 ${total} 件`);
  await prisma.$disconnect();
}
