import Link from 'next/link';

import { Rating } from '@/components/ui/Rating';
import { ja } from '@/lib/i18n/ja';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/db/client';

import { ReviewForm } from './ReviewForm';
import { ReviewItem } from './ReviewItem';

interface ReviewSectionProps {
  workId: number;
}

// 作品ごとのレビュー/星評価・通報・コメントセクション(P1-4)。
// 平均評価・レビュー件数の表示は P1-5 のランキング機能(server/services/ranking.ts,
// components/ranking/RankingEntryRow.tsx)と同じ文言・換算方法(1〜10 スケール → /2 して
// ★5 段階表示)に揃えている。ただしこのセクション自体はランキングの並び替えには関与しない。
export async function ReviewSection({ workId }: ReviewSectionProps) {
  const currentUser = await getCurrentUser();

  const reviews = await prisma.review.findMany({
    where: { workId },
    include: {
      user: { select: { id: true, nickname: true } },
      comments: {
        include: { user: { select: { id: true, nickname: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const reportedReviewIds = currentUser
    ? new Set(
        (
          await prisma.reviewReport.findMany({
            where: {
              reporterId: currentUser.id,
              reviewId: { in: reviews.map((review) => review.id) },
            },
            select: { reviewId: true },
          })
        ).map((report) => report.reviewId),
      )
    : new Set<number>();

  const myReview = currentUser
    ? (reviews.find((review) => review.userId === currentUser.id) ?? null)
    : null;

  const reviewCount = reviews.length;
  const averageRating =
    reviewCount > 0
      ? reviews.reduce((total, review) => total + review.rating, 0) / reviewCount
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-foreground text-xl font-semibold tracking-tight">
          {ja.works.reviews.sectionTitle}
        </h2>
        {averageRating != null ? (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Rating value={averageRating / 2} size={14} />
            <span className="text-muted-foreground text-xs">
              {ja.ranking.common.averageRatingLabel(averageRating.toFixed(1))}
            </span>
            <span className="text-muted-foreground text-xs">
              {ja.ranking.common.reviewCountLabel(reviewCount)}
            </span>
          </div>
        ) : (
          <p className="text-muted-foreground mt-1 text-xs">{ja.ranking.common.noReviewsYet}</p>
        )}
      </div>

      {currentUser ? (
        <ReviewForm
          workId={workId}
          initialReview={
            myReview
              ? { rating: myReview.rating, body: myReview.body, isSpoiler: myReview.isSpoiler }
              : null
          }
        />
      ) : (
        <p className="text-muted-foreground text-sm">
          {ja.works.reviews.loginPrompt}{' '}
          <Link href="/login" className="text-primary underline">
            {ja.works.reviews.loginLink}
          </Link>
        </p>
      )}

      {reviews.length === 0 ? (
        <p className="text-muted-foreground text-sm">{ja.works.reviews.empty}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {reviews.map((review) => (
            <ReviewItem
              key={review.id}
              review={{
                id: review.id,
                rating: review.rating,
                body: review.body,
                isSpoiler: review.isSpoiler,
                author: review.user,
                comments: review.comments.map((comment) => ({
                  id: comment.id,
                  body: comment.body,
                  author: comment.user,
                })),
              }}
              isLoggedIn={Boolean(currentUser)}
              isOwnReview={currentUser?.id === review.userId}
              initiallyReported={reportedReviewIds.has(review.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
