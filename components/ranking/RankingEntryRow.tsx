import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';
import { Rating } from '@/components/ui/Rating';
import { ja } from '@/lib/i18n/ja';
import type { RankingEntry } from '@/server/services/ranking';

export interface RankingEntryRowProps {
  entry: RankingEntry;
  /** 通常のランキング順位(1 始まり)。情報不足セクションでは null にして順位バッジの代わりに「情報不足」バッジを出す。 */
  rank: number | null;
  /**
   * 前日比の順位変動(P2-6)。プラスは順位上昇、マイナスは下降、0 は変動なし。
   * スナップショットが2日分以上無い等で比較できない場合は undefined にして、
   * バッジ自体を表示しない(server/services/rankingChanges.ts 参照)。
   */
  rankChange?: number;
}

function pickDisplayTitle(work: RankingEntry['work']): string {
  return work.titleNative ?? work.titleRomaji ?? work.titleEnglish ?? '無題';
}

function RankChangeBadge({ rankChange }: { rankChange: number }) {
  if (rankChange > 0) {
    return <Badge variant="success">{ja.ranking.common.rankChange.up(rankChange)}</Badge>;
  }
  if (rankChange < 0) {
    return <Badge variant="error">{ja.ranking.common.rankChange.down(-rankChange)}</Badge>;
  }
  return <Badge variant="default">{ja.ranking.common.rankChange.same}</Badge>;
}

// マンガランキング/アニメランキング共通の 1 行分の表示(作品カバー・タイトル・
// 順位 or 情報不足バッジ・平均評価・レビュー件数・前日比の順位変動バッジ)。
export function RankingEntryRow({ entry, rank, rankChange }: RankingEntryRowProps) {
  const { work, reviewCount, averageRating } = entry;

  return (
    <li>
      <Link
        href={`/works/${work.id}`}
        className="border-border bg-surface hover:border-primary flex items-center gap-4 rounded-xl border p-3 transition-colors"
      >
        <div className="flex w-12 flex-none flex-col items-center gap-1 text-center">
          {rank != null ? (
            <span className="text-foreground text-lg font-bold tabular-nums">{rank}</span>
          ) : (
            <Badge variant="warning">{ja.ranking.common.insufficientData.badge}</Badge>
          )}
          {rankChange != null && <RankChangeBadge rankChange={rankChange} />}
        </div>

        {work.coverImageUrl ? (
          // AniList の画像を直接 hotlink する方針のため通常の img 要素を使う。
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={work.coverImageUrl}
            alt=""
            className="h-20 w-14 flex-none rounded object-cover"
          />
        ) : (
          <div className="bg-muted h-20 w-14 flex-none rounded" aria-hidden />
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-foreground truncate text-sm font-semibold">{pickDisplayTitle(work)}</p>
          {averageRating != null ? (
            <div className="flex flex-wrap items-center gap-2">
              {/* DB 上は 1〜10 スケールのため、★5 段階表示のために /2 して渡す。 */}
              <Rating value={averageRating / 2} size={14} />
              <span className="text-muted-foreground text-xs">
                {ja.ranking.common.averageRatingLabel(averageRating.toFixed(1))}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground text-xs">{ja.ranking.common.noReviewsYet}</span>
          )}
          <span className="text-muted-foreground text-xs">
            {ja.ranking.common.reviewCountLabel(reviewCount)}
          </span>
        </div>
      </Link>
    </li>
  );
}
