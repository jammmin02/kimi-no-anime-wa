import { ja } from '@/lib/i18n/ja';
import { getReviewSummaries } from '@/server/services/reviewSummaries';

interface ReviewSummarySectionProps {
  workId: number;
  /** 要約プロンプトに含める作品タイトル(getReviewSummaries に渡す)。 */
  workTitle: string;
}

// 別点区間別 AI レビュー要約セクション(P2-3)。
// 最小レビュー数(MIN_REVIEWS_FOR_SUMMARY)未満の作品では要約を出さず、案内文のみ表示する。
// Claude API の呼び出しはコストとレイテンシがかかるため getReviewSummaries 側で
// DB キャッシュしており、このコンポーネント自体は結果を表示するだけの薄い責務に留める。
export async function ReviewSummarySection({ workId, workTitle }: ReviewSummarySectionProps) {
  const result = await getReviewSummaries(workId, workTitle);

  return (
    <div className="border-border bg-muted flex flex-col gap-3 rounded-lg border p-4">
      <div>
        <h2 className="text-foreground text-lg font-semibold tracking-tight">
          {ja.works.reviews.summary.sectionTitle}
        </h2>
        <p className="text-muted-foreground text-xs">
          {ja.works.reviews.summary.sectionDescription}
        </p>
      </div>

      {result.status === 'insufficient' ? (
        <p className="text-muted-foreground text-sm">
          {ja.works.reviews.summary.insufficientNotice}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {result.bands.map((bandResult) => (
            <div key={bandResult.band}>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-foreground text-sm font-semibold">
                  {ja.works.reviews.summary.bandLabels[bandResult.band]}
                </span>
                {bandResult.reviewCount > 0 && (
                  <span className="text-muted-foreground text-xs">
                    {ja.works.reviews.summary.reviewCountLabel(bandResult.reviewCount)}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                {bandResult.reviewCount === 0
                  ? ja.works.reviews.summary.emptyBand
                  : (bandResult.summary ?? ja.works.reviews.summary.unavailable)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
