import Link from 'next/link';
import type { Metadata } from 'next';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { ja } from '@/lib/i18n/ja';

export const metadata: Metadata = {
  title: `${ja.ranking.landing.title} | 君のアニメは`,
};

// ランキングトップ(P1-5)。マンガランキング/アニメランキングへの導線のみを提供する。
// 国別比較(アニメの Phase 3 項目)や年齢/性別別ランキングはここには含めない。
export default function RankingLandingPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          {ja.ranking.landing.title}
        </h1>
        <p className="text-muted-foreground text-sm">{ja.ranking.landing.description}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/ranking/manga">
          <Card className="hover:border-primary h-full transition-colors">
            <CardHeader>
              <CardTitle>{ja.ranking.landing.mangaCard.title}</CardTitle>
              <CardDescription>{ja.ranking.landing.mangaCard.description}</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/ranking/anime">
          <Card className="hover:border-primary h-full transition-colors">
            <CardHeader>
              <CardTitle>{ja.ranking.landing.animeCard.title}</CardTitle>
              <CardDescription>{ja.ranking.landing.animeCard.description}</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
