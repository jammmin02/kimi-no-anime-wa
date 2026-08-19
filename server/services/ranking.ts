// マンガランキング/アニメランキング(P1-5)共通の集計ロジック。
//
// 重要: 並び替えは当サービス自身のレビュー/星評価データのみを基準に行う。
// Work.popularity / averageScore / trending(AniList 由来の参考指標)は
// 絶対にランキングの並び替えに使用しないこと
// (implementation_prompts_ko.md の共通規則・ランキング規則を参照)。

import { MIN_REVIEW_COUNT_FOR_RANKING } from '@/lib/constants/ranking';
import { prisma } from '@/server/db/client';
import type { Season, WorkCountry, WorkType } from '@/server/db/generated/prisma/enums';

/** ランキング表示に必要な最小限の作品フィールド。 */
export interface RankingWork {
  id: number;
  type: WorkType;
  titleRomaji: string | null;
  titleEnglish: string | null;
  titleNative: string | null;
  coverImageUrl: string | null;
}

export interface RankingEntry {
  work: RankingWork;
  /** レビュー件数。 */
  reviewCount: number;
  /** 1〜10 スケールでの平均評価。レビューが 1 件も無い場合は null。 */
  averageRating: number | null;
}

export interface FetchRankingParams {
  type: WorkType;
  countryOfOrigin?: WorkCountry;
  genre?: string;
  season?: Season;
  seasonYear?: number;
}

export interface RankingResult {
  /** 最小レビュー数以上で、平均評価の高い順に並んだ「順位付け対象」の作品群。 */
  ranked: RankingEntry[];
  /** 最小レビュー数に満たないため順位付けから外した「情報不足」の作品群。 */
  insufficient: RankingEntry[];
}

// 平均評価の高い順。同点の場合はレビュー数が多い方(より多くの評価に裏付けられている方)を
// 優先し、それも同じ場合は id 昇順で並び順を安定させる。
function compareRankedEntries(a: RankingEntry, b: RankingEntry): number {
  return (
    (b.averageRating ?? 0) - (a.averageRating ?? 0) ||
    b.reviewCount - a.reviewCount ||
    a.work.id - b.work.id
  );
}

/**
 * 与えられた作品群を、当サービス自身のレビュー/星評価データのみで集計・並び替える。
 * 最小レビュー数(MIN_REVIEW_COUNT_FOR_RANKING)に満たない作品は `insufficient` に分離し、
 * ランキング本体の並び順を歪めないようにする。
 *
 * マンガ/アニメランキング(fetchRanking)だけでなく、自然言語検索(server/services/search.ts)の
 * 結果一覧にも同じ並び替え規則をそのまま適用するために、絞り込み(where 条件)とは
 * 独立させて再利用できるようにしてある。
 */
export async function rankByOwnReviews(works: RankingWork[]): Promise<RankingResult> {
  // レビュー本文を含む全レコードを読み込むのではなく、work_id ごとの平均/件数だけを
  // 集計させる(groupBy)。対象作品が 0 件なら DB に問い合わせるまでもない。
  const workIds = works.map((work) => work.id);
  const aggregates =
    workIds.length > 0
      ? await prisma.review.groupBy({
          by: ['workId'],
          where: { workId: { in: workIds } },
          _avg: { rating: true },
          _count: { rating: true },
        })
      : [];
  const aggregateByWorkId = new Map(aggregates.map((aggregate) => [aggregate.workId, aggregate]));

  const entries: RankingEntry[] = works.map((work) => {
    const aggregate = aggregateByWorkId.get(work.id);
    return {
      work,
      reviewCount: aggregate?._count.rating ?? 0,
      averageRating: aggregate?._avg.rating ?? null,
    };
  });

  const ranked = entries
    .filter((entry) => entry.reviewCount >= MIN_REVIEW_COUNT_FOR_RANKING)
    .sort(compareRankedEntries);
  const insufficient = entries
    .filter((entry) => entry.reviewCount < MIN_REVIEW_COUNT_FOR_RANKING)
    .sort(compareRankedEntries);

  return { ranked, insufficient };
}

/**
 * 条件に合致する作品を取得し、レビュー/星評価データのみで集計・並び替えを行う。
 */
export async function fetchRanking(params: FetchRankingParams): Promise<RankingResult> {
  const where = {
    type: params.type,
    ...(params.countryOfOrigin ? { countryOfOrigin: params.countryOfOrigin } : {}),
    ...(params.genre ? { genres: { has: params.genre } } : {}),
    ...(params.season ? { season: params.season } : {}),
    ...(params.seasonYear ? { seasonYear: params.seasonYear } : {}),
  };

  const works = await prisma.work.findMany({
    where,
    select: {
      id: true,
      type: true,
      titleRomaji: true,
      titleEnglish: true,
      titleNative: true,
      coverImageUrl: true,
    },
  });

  return rankByOwnReviews(works);
}
