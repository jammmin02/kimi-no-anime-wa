// 別点区間別 AI レビュー要約(P2-3)。
//
// 作品ごとのレビューを星評価の区間(高評価/中間評価/低評価)に分け、区間ごとに
// Claude API(server/services/claude/reviewSummary.ts)へ要約を依頼する。
//
// Claude API の呼び出しにはコストとレイテンシがかかるため、生成結果は
// ReviewSummary テーブルにキャッシュし、その区間のレビュー件数が前回生成時から
// 変化していない限り再利用する(レビュー本文だけを編集しても件数は変わらないため
// 再生成されない。これは「レビューが追加/削除されたときだけ再生成する」という
// 要件を、追加コストなしで満たすための簡易な判定方法として割り切っている)。

import {
  HIGH_RATING_BAND_MIN,
  LOW_RATING_BAND_MAX,
  MIN_REVIEWS_FOR_SUMMARY,
} from '@/lib/constants/reviewSummaries';
import type { ReviewSummariesResult, ReviewSummaryBandResult } from '@/lib/types/reviewSummaries';
import { prisma } from '@/server/db/client';
import type { RatingBand } from '@/server/db/generated/prisma/enums';

import { ReviewSummaryError, summarizeReviewBand } from './claude/reviewSummary';

const ALL_RATING_BANDS: RatingBand[] = ['HIGH', 'MEDIUM', 'LOW'];

/** 1〜10 スケールの評価値から、どの区間に属するかを判定する。 */
function bandForRating(rating: number): RatingBand {
  if (rating >= HIGH_RATING_BAND_MIN) return 'HIGH';
  if (rating <= LOW_RATING_BAND_MAX) return 'LOW';
  return 'MEDIUM';
}

interface ReviewForSummary {
  rating: number;
  body: string;
  isSpoiler: boolean;
}

/**
 * 指定した作品の区間別 AI レビュー要約を取得する。
 * 必要に応じて Claude API を呼び出して再生成し、結果を DB にキャッシュする。
 *
 * @param workId 対象の作品 ID。
 * @param workTitle 要約プロンプトに含める作品タイトル(表示用)。
 */
export async function getReviewSummaries(
  workId: number,
  workTitle: string,
): Promise<ReviewSummariesResult> {
  // 直近のレビューを優先して要約プロンプトに使えるよう、新しい順に取得しておく。
  const reviews = await prisma.review.findMany({
    where: { workId },
    select: { rating: true, body: true, isSpoiler: true },
    orderBy: { createdAt: 'desc' },
  });

  if (reviews.length < MIN_REVIEWS_FOR_SUMMARY) {
    return {
      status: 'insufficient',
      reviewCount: reviews.length,
      requiredCount: MIN_REVIEWS_FOR_SUMMARY,
    };
  }

  const reviewsByBand = new Map<RatingBand, ReviewForSummary[]>(
    ALL_RATING_BANDS.map((band) => [band, []]),
  );
  for (const review of reviews) {
    reviewsByBand.get(bandForRating(review.rating))?.push(review);
  }

  const existingSummaries = await prisma.reviewSummary.findMany({ where: { workId } });
  const existingByBand = new Map(existingSummaries.map((summary) => [summary.ratingBand, summary]));

  const bands: ReviewSummaryBandResult[] = [];

  for (const band of ALL_RATING_BANDS) {
    const bandReviews = reviewsByBand.get(band) ?? [];
    const existing = existingByBand.get(band);

    if (bandReviews.length === 0) {
      bands.push({ band, reviewCount: 0, summary: null });
      continue;
    }

    // キャッシュ済みの要約があり、かつ生成時からレビュー件数が変わっていなければ
    // Claude を呼ばずにそのまま使い回す。
    if (existing && existing.reviewCount === bandReviews.length) {
      bands.push({ band, reviewCount: bandReviews.length, summary: existing.summary });
      continue;
    }

    try {
      const summary = await summarizeReviewBand(bandReviews, band, workTitle);
      await prisma.reviewSummary.upsert({
        where: { workId_ratingBand: { workId, ratingBand: band } },
        create: { workId, ratingBand: band, summary, reviewCount: bandReviews.length },
        update: { summary, reviewCount: bandReviews.length },
      });
      bands.push({ band, reviewCount: bandReviews.length, summary });
    } catch (error) {
      if (!(error instanceof ReviewSummaryError)) {
        throw error;
      }
      // Claude 呼び出しに失敗した場合は、古くても既存キャッシュがあればそれを暫定的に
      // 表示する(無ければ summary は null のままにし、画面側でエラー文言を出す)。
      bands.push({ band, reviewCount: bandReviews.length, summary: existing?.summary ?? null });
    }
  }

  return { status: 'ready', bands };
}
