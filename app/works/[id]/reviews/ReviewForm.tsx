'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Rating } from '@/components/ui/Rating';
import { Textarea } from '@/components/ui/Textarea';
import { MAX_RATING, MAX_REVIEW_BODY_LENGTH, MIN_RATING } from '@/lib/constants/reviews';
import { ja } from '@/lib/i18n/ja';
import type { ReviewErrorResponse } from '@/lib/types/reviews';

const MESSAGES = ja.works.reviews.form;

export interface ReviewFormProps {
  workId: number;
  /** ログイン中ユーザーが既にこの作品にレビューを投稿済みの場合、その内容(編集モード用)。 */
  initialReview: { rating: number; body: string; isSpoiler: boolean } | null;
}

// レビュー投稿/編集フォーム。Review.workId + userId には一意制約があるため
// (schema.prisma 参照)、既にレビュー済みのユーザーがここから送信すると更新扱いになる。
export function ReviewForm({ workId, initialReview }: ReviewFormProps) {
  const router = useRouter();
  const isEditing = initialReview !== null;

  // ★5 段階の入力 UI から 1〜10 スケールの DB 値へ変換する(Rating コンポーネントの
  // 想定どおり、rating/2 を渡して表示し、onChange では starIndex*2 を保存する)。
  const [rating, setRating] = useState(initialReview?.rating ?? 0);
  const [body, setBody] = useState(initialReview?.body ?? '');
  const [isSpoiler, setIsSpoiler] = useState(initialReview?.isSpoiler ?? false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (rating < MIN_RATING || rating > MAX_RATING) {
      setError(MESSAGES.errors.invalidRating);
      return;
    }
    if (!body.trim()) {
      setError(MESSAGES.errors.bodyRequired);
      return;
    }
    if (body.length > MAX_REVIEW_BODY_LENGTH) {
      setError(MESSAGES.errors.bodyTooLong);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/works/${workId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, body, isSpoiler }),
      });

      if (!response.ok) {
        const data: ReviewErrorResponse = await response.json().catch(() => ({ error: 'generic' }));
        setError(MESSAGES.errors[data.error] ?? MESSAGES.errors.generic);
        return;
      }

      setSuccessMessage(isEditing ? MESSAGES.updateSuccess : MESSAGES.submitSuccess);
      // レビュー一覧はサーバーコンポーネント(ReviewSection)側で描画しているため、
      // 投稿/更新後はサーバーデータを再取得して反映させる。
      router.refresh();
    } catch {
      setError(MESSAGES.errors.generic);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? MESSAGES.titleEdit : MESSAGES.titleNew}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label={MESSAGES.ratingLabel}>
            {() => (
              <Rating
                value={rating / 2}
                onChange={(value) => setRating(value * 2)}
                aria-label={MESSAGES.ratingLabel}
              />
            )}
          </FormField>

          <FormField label={MESSAGES.bodyLabel}>
            {(id) => (
              <Textarea
                id={id}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={MESSAGES.bodyPlaceholder}
                maxLength={MAX_REVIEW_BODY_LENGTH}
                invalid={Boolean(error)}
              />
            )}
          </FormField>

          <label className="text-foreground flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isSpoiler}
              onChange={(event) => setIsSpoiler(event.target.checked)}
              className="accent-primary h-4 w-4 rounded"
            />
            {MESSAGES.spoilerLabel}
          </label>

          {error && <p className="text-error text-xs">{error}</p>}

          <div className="flex items-center gap-3">
            <Button type="submit" isLoading={isSubmitting}>
              {isSubmitting
                ? isEditing
                  ? MESSAGES.updating
                  : MESSAGES.submitting
                : isEditing
                  ? MESSAGES.update
                  : MESSAGES.submit}
            </Button>
            {successMessage && <p className="text-success text-sm">{successMessage}</p>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
