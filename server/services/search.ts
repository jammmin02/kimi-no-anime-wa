// 自然言語検索(P2-1)。
//
// Claude API に「自体 DB に同期済みのジャンル/タグ候補一覧」と「ユーザーの自然言語クエリ」を
// 渡して関連するジャンル/タグの組み合わせを抽出してもらい、その組み合わせで自体 DB
// (Work/WorkTag)を絞り込む。並び替えは server/services/ranking.ts の rankByOwnReviews を
// そのまま再利用し、当サービス自身のレビュー/星評価データのみを基準にする
// (implementation_prompts_ko.md の共通規則・ランキング規則を参照。AniList の
// popularity/averageScore/trending は検索結果の並び替えにも一切使用しない)。

import { MAX_TAGS_FOR_PROMPT } from '@/lib/constants/search';
import { prisma } from '@/server/db/client';
import { extractSearchFilters } from '@/server/services/claude/naturalLanguageSearch';
import { rankByOwnReviews, type RankingResult } from '@/server/services/ranking';
import type { WorkType } from '@/server/db/generated/prisma/enums';

export interface NaturalLanguageSearchParams {
  query: string;
  type?: WorkType;
}

export interface NaturalLanguageSearchResult extends RankingResult {
  /** 実際に検索の絞り込みに使われたジャンル/タグの組み合わせ(結果画面での表示用)。 */
  matchedGenres: string[];
  matchedTags: string[];
}

/** 自体 DB に同期済みの、重複排除したジャンル一覧を取得する(works/ranking 一覧と同じ集計方法)。 */
async function fetchAvailableGenres(): Promise<string[]> {
  const rows = await prisma.$queryRaw<
    { genre: string }[]
  >`SELECT DISTINCT genre FROM works, unnest(genres) AS genre ORDER BY genre`;
  return rows.map((row) => row.genre);
}

/**
 * 自体 DB に同期済みの、重複排除したタグ名一覧を取得する。
 * プロンプトのトークン量を抑えるため、付与件数が多い(≒代表的な)タグを優先して
 * MAX_TAGS_FOR_PROMPT 件で打ち切る。
 */
async function fetchAvailableTags(): Promise<string[]> {
  const rows = await prisma.workTag.groupBy({
    by: ['name'],
    _count: { name: true },
    orderBy: { _count: { name: 'desc' } },
    take: MAX_TAGS_FOR_PROMPT,
  });
  return rows.map((row) => row.name).sort((a, b) => a.localeCompare(b));
}

/**
 * 自然言語クエリから作品を検索する。
 *
 * Claude が候補一覧から関連するジャンル/タグを 1 つも抽出できなかった場合は、
 * 自体 DB への問い合わせ自体を行わず空の結果を返す(全件を返してしまうと
 * 「検索」として意味が無いため)。
 *
 * Claude API の呼び出し失敗(レートリミット等)は extractSearchFilters が投げる
 * NaturalLanguageSearchError をそのまま呼び出し元(app/search/page.tsx)に伝播させるので、
 * 呼び出し側で捕捉してユーザー向けのエラー表示に変換すること。
 */
export async function searchWorksByNaturalLanguage(
  params: NaturalLanguageSearchParams,
): Promise<NaturalLanguageSearchResult> {
  const [availableGenres, availableTags] = await Promise.all([
    fetchAvailableGenres(),
    fetchAvailableTags(),
  ]);

  const { genres, tags } = await extractSearchFilters(params.query, availableGenres, availableTags);

  if (genres.length === 0 && tags.length === 0) {
    return { ranked: [], insufficient: [], matchedGenres: [], matchedTags: [] };
  }

  const works = await prisma.work.findMany({
    where: {
      ...(params.type ? { type: params.type } : {}),
      OR: [
        // genres は文字列配列カラムのため、候補のいずれかを含むかどうかで判定する。
        ...(genres.length > 0 ? [{ genres: { hasSome: genres } }] : []),
        // タグは WorkTag へのリレーション経由。
        ...(tags.length > 0 ? [{ tags: { some: { name: { in: tags } } } }] : []),
      ],
    },
    select: {
      id: true,
      type: true,
      titleRomaji: true,
      titleEnglish: true,
      titleNative: true,
      coverImageUrl: true,
    },
  });

  const { ranked, insufficient } = await rankByOwnReviews(works);

  return { ranked, insufficient, matchedGenres: genres, matchedTags: tags };
}
