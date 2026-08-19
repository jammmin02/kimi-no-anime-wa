'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Rating } from '@/components/ui/Rating';
import { Textarea } from '@/components/ui/Textarea';
import { MAX_COMMENT_BODY_LENGTH } from '@/lib/constants/reviews';
import { ja } from '@/lib/i18n/ja';
import type { CommentErrorResponse, ReportErrorResponse } from '@/lib/types/reviews';
import type { ReportReason } from '@/server/db/generated/prisma/enums';

const MESSAGES = ja.works.reviews.item;

interface ReviewAuthor {
  id: number;
  nickname: string;
}

interface ReviewCommentData {
  id: number;
  body: string;
  author: ReviewAuthor;
}

export interface ReviewItemData {
  id: number;
  rating: number;
  body: string;
  isSpoiler: boolean;
  author: ReviewAuthor;
  comments: ReviewCommentData[];
}

export interface ReviewItemProps {
  review: ReviewItemData;
  isLoggedIn: boolean;
  /** ログイン中ユーザー自身のレビューかどうか(自分のレビューには通報ボタンを出さない)。 */
  isOwnReview: boolean;
  initiallyReported: boolean;
}

const REPORT_REASONS: ReportReason[] = ['SPOILER', 'ABUSE', 'SPAM', 'OFF_TOPIC', 'OTHER'];

// レビュー 1 件分の表示。ネタバレの隠し表示・通報・コメントの投稿と一覧をまとめて扱う。
export function ReviewItem({
  review,
  isLoggedIn,
  isOwnReview,
  initiallyReported,
}: ReviewItemProps) {
  const [isSpoilerRevealed, setIsSpoilerRevealed] = useState(false);

  const [comments, setComments] = useState(review.comments);
  const [commentBody, setCommentBody] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isReported, setIsReported] = useState(initiallyReported);

  async function handleAddComment() {
    setCommentError(null);
    const trimmed = commentBody.trim();
    if (!trimmed) {
      setCommentError(MESSAGES.commentErrors.bodyRequired);
      return;
    }
    if (trimmed.length > MAX_COMMENT_BODY_LENGTH) {
      setCommentError(MESSAGES.commentErrors.bodyTooLong);
      return;
    }

    setIsSubmittingComment(true);
    try {
      const response = await fetch(`/api/reviews/${review.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed }),
      });

      if (!response.ok) {
        const data: CommentErrorResponse = await response
          .json()
          .catch(() => ({ error: 'generic' }));
        setCommentError(MESSAGES.commentErrors[data.error] ?? MESSAGES.commentErrors.generic);
        return;
      }

      const { comment } = (await response.json()) as { comment: ReviewCommentData };
      setComments((current) => [...current, comment]);
      setCommentBody('');
    } catch {
      setCommentError(MESSAGES.commentErrors.generic);
    } finally {
      setIsSubmittingComment(false);
    }
  }

  async function handleSubmitReport() {
    setReportError(null);
    if (!reportReason) {
      setReportError(MESSAGES.reportErrors.reasonRequired);
      return;
    }

    setIsSubmittingReport(true);
    try {
      const response = await fetch(`/api/reviews/${review.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reportReason }),
      });

      if (!response.ok) {
        const data: ReportErrorResponse = await response.json().catch(() => ({ error: 'generic' }));
        if (data.error === 'alreadyReported') {
          setIsReported(true);
        }
        setReportError(MESSAGES.reportErrors[data.error] ?? MESSAGES.reportErrors.generic);
        return;
      }

      setIsReported(true);
      setIsReportDialogOpen(false);
    } catch {
      setReportError(MESSAGES.reportErrors.generic);
    } finally {
      setIsSubmittingReport(false);
    }
  }

  return (
    <li className="border-border bg-surface rounded-xl border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-foreground text-sm font-semibold">{review.author.nickname}</span>
          <Rating value={review.rating / 2} size={14} />
        </div>
        {isLoggedIn && !isOwnReview && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isReported}
            onClick={() => setIsReportDialogOpen(true)}
          >
            {isReported ? MESSAGES.alreadyReported : MESSAGES.reportButton}
          </Button>
        )}
      </div>

      <div className="mt-2">
        {review.isSpoiler && !isSpoilerRevealed ? (
          <div className="bg-muted flex flex-col items-start gap-2 rounded-lg p-3">
            <p className="text-muted-foreground text-xs">{MESSAGES.spoilerHiddenNotice}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSpoilerRevealed(true)}
            >
              {MESSAGES.showSpoilerButton}
            </Button>
          </div>
        ) : (
          <p className="text-foreground text-sm whitespace-pre-wrap">{review.body}</p>
        )}
      </div>

      <div className="border-border mt-4 flex flex-col gap-2 border-t pt-3">
        <p className="text-muted-foreground text-xs font-semibold">{MESSAGES.commentsTitle}</p>

        {comments.length === 0 ? (
          <p className="text-muted-foreground text-xs">{MESSAGES.commentsEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {comments.map((comment) => (
              <li key={comment.id} className="text-sm">
                <span className="text-foreground font-medium">{comment.author.nickname}</span>{' '}
                <span className="text-muted-foreground">{comment.body}</span>
              </li>
            ))}
          </ul>
        )}

        {isLoggedIn ? (
          <div className="flex items-start gap-2">
            <Textarea
              rows={1}
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value)}
              placeholder={MESSAGES.commentPlaceholder}
              maxLength={MAX_COMMENT_BODY_LENGTH}
              invalid={Boolean(commentError)}
            />
            <Button
              type="button"
              size="sm"
              isLoading={isSubmittingComment}
              onClick={handleAddComment}
            >
              {MESSAGES.commentSubmit}
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">{MESSAGES.commentLoginPrompt}</p>
        )}
        {commentError && <p className="text-error text-xs">{commentError}</p>}
      </div>

      <Dialog
        open={isReportDialogOpen}
        onClose={() => setIsReportDialogOpen(false)}
        title={MESSAGES.reportDialogTitle}
      >
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">{MESSAGES.reportReasonLabel}</p>
          <div className="flex flex-col gap-1.5">
            {REPORT_REASONS.map((reason) => (
              <label key={reason} className="text-foreground flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`report-reason-${review.id}`}
                  checked={reportReason === reason}
                  onChange={() => setReportReason(reason)}
                  className="accent-primary h-4 w-4"
                />
                {MESSAGES.reportReasons[reason]}
              </label>
            ))}
          </div>

          {reportError && <p className="text-error text-xs">{reportError}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsReportDialogOpen(false)}>
              {MESSAGES.cancel}
            </Button>
            <Button
              type="button"
              variant="primary"
              isLoading={isSubmittingReport}
              onClick={handleSubmitReport}
            >
              {MESSAGES.reportSubmit}
            </Button>
          </div>
        </div>
      </Dialog>
    </li>
  );
}
