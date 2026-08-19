// 別点区間別 AI レビュー要約(P2-3)関連で、サーバー側サービスとクライアント
// コンポーネントの両方から共有する型定義。

import type { RatingBand } from '@/server/db/generated/prisma/enums';

export type ReviewSummaryErrorCode = 'rateLimited' | 'claudeUnavailable' | 'generic';

/** 区間 1 つ分の要約結果。 */
export interface ReviewSummaryBandResult {
  band: RatingBand;
  /** この区間に属するレビューの件数(0 件ならその区間は要約対象外)。 */
  reviewCount: number;
  /**
   * 生成された要約文。以下のいずれかの場合は null になる。
   * - reviewCount が 0(この区間にレビューが無い)
   * - Claude API の呼び出しに失敗し、かつキャッシュ済みの要約も無い
   */
  summary: string | null;
}

/**
 * 作品ごとの要約結果全体。
 * - 作品全体のレビュー数が MIN_REVIEWS_FOR_SUMMARY 未満の場合は `insufficient`。
 * - 満たしている場合は `ready` で、区間ごとの結果を bands に持つ。
 */
export type ReviewSummariesResult =
  | { status: 'insufficient'; reviewCount: number; requiredCount: number }
  | { status: 'ready'; bands: ReviewSummaryBandResult[] };
