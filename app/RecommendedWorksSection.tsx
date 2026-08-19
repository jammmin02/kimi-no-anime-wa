import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';
import { buttonVariants } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ja } from '@/lib/i18n/ja';
import type { RecommendationEntryWithReason } from '@/server/services/recommendationReasons';

export interface RecommendedWorksSectionProps {
  /** ログインユーザーが取り好みキーワードを 1 件以上登録済みかどうか。 */
  hasTasteKeywords: boolean;
  recommendations: RecommendationEntryWithReason[];
}

function pickDisplayTitle(work: RecommendationEntryWithReason['work']): string {
  return work.titleNative ?? work.titleRomaji ?? work.titleEnglish ?? '無題';
}

// ホーム画面の「おすすめ作品」セクション(P1-6)。
// 取り好みキーワードと AniList タグの連関度 % で計算したコンテンツベースのおすすめに、
// Claude API が生成した自然文のおすすめ理由(P2-4)を添えて表示する。
export function RecommendedWorksSection({
  hasTasteKeywords,
  recommendations,
}: RecommendedWorksSectionProps) {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 sm:px-6">
      <div>
        <h2 className="text-foreground text-xl font-bold tracking-tight">
          {ja.home.recommendations.title}
        </h2>
        <p className="text-muted-foreground text-sm">{ja.home.recommendations.description}</p>
      </div>

      {!hasTasteKeywords ? (
        <EmptyState
          title={ja.home.recommendations.noKeywords.title}
          description={ja.home.recommendations.noKeywords.description}
          action={
            <Link href="/mypage" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
              {ja.home.recommendations.noKeywords.action}
            </Link>
          }
        />
      ) : recommendations.length === 0 ? (
        <EmptyState
          title={ja.home.recommendations.empty.title}
          description={ja.home.recommendations.empty.description}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {recommendations.map((entry) => (
            <Link key={entry.work.id} href={`/works/${entry.work.id}`}>
              <Card className="h-full overflow-hidden">
                {entry.work.coverImageUrl ? (
                  // AniList の画像を直接 hotlink する方針のため通常の img 要素を使う。
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.work.coverImageUrl} alt="" className="h-48 w-full object-cover" />
                ) : (
                  <div className="bg-muted h-48 w-full" aria-hidden />
                )}
                <CardContent className="flex flex-col gap-1.5 pt-4">
                  <Badge
                    variant={entry.work.type === 'ANIME' ? 'primary' : 'secondary'}
                    className="self-start"
                  >
                    {ja.works.detail.typeLabels[entry.work.type]}
                  </Badge>
                  <p className="text-foreground line-clamp-2 text-sm font-medium">
                    {pickDisplayTitle(entry.work)}
                  </p>
                  {/* 「なぜおすすめか」の理由表示。Claude API が生成した自然文(P2-4)。 */}
                  <p className="text-muted-foreground line-clamp-2 text-xs">{entry.reason}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
