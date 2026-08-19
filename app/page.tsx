import { existsSync } from 'node:fs';
import path from 'node:path';

import Image from 'next/image';
import { ImageIcon } from 'lucide-react';

import { RECOMMENDATION_LIMIT } from '@/lib/constants/recommendations';
import { ja } from '@/lib/i18n/ja';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/db/client';
import { attachRecommendationReasons } from '@/server/services/recommendationReasons';
import { computeTasteBasedRecommendations } from '@/server/services/recommendations';

import { RecommendedWorksSection } from './RecommendedWorksSection';

// ヒーローセクション用の画像。public/images/hero.{jpg,jpeg,png,webp} のいずれかに
// ファイルを置くだけで、コード変更なしにここへ表示される。未配置の間はプレース
// ホルダーを表示する。
const HERO_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;

function findHeroImagePath(): string | null {
  for (const ext of HERO_IMAGE_EXTENSIONS) {
    const relativePath = `/images/hero.${ext}`;
    if (existsSync(path.join(process.cwd(), 'public', relativePath))) {
      return relativePath;
    }
  }
  return null;
}

function HeroImage() {
  const heroImagePath = findHeroImagePath();

  return (
    <div className="border-border bg-muted relative aspect-video w-full overflow-hidden rounded-xl border">
      {heroImagePath ? (
        <Image
          src={heroImagePath}
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 1024px, 100vw"
          className="object-cover"
        />
      ) : (
        <div className="text-muted-foreground flex h-full w-full flex-col items-center justify-center gap-2">
          <ImageIcon className="h-8 w-8" aria-hidden />
          <p className="text-sm">public/images/hero.jpg に画像を置くと表示されます</p>
        </div>
      )}
    </div>
  );
}

// トップページ。デザインシステム(P0-5)のトークン・コンポーネントのみを使い、
// 独自の色やスタイルを持ち込まない。
//
// P1-6: ログイン中で取り好みキーワードを登録済みのユーザーには、キーワードと
// AniList タグの連関度 % のみで計算したコンテンツベースのおすすめセクションを
// 追加で表示する(未ログイン・未登録の場合は導線のみ表示)。
// P2-4: 各おすすめに、Claude API が生成した自然文のおすすめ理由を添える。
export default async function Home() {
  const user = await getCurrentUser();

  let tasteKeywords: string[] = [];
  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { tasteKeywords: true },
    });
    tasteKeywords = dbUser?.tasteKeywords ?? [];
  }

  const baseRecommendations =
    tasteKeywords.length > 0
      ? await computeTasteBasedRecommendations(tasteKeywords, RECOMMENDATION_LIMIT)
      : [];

  const recommendations =
    user && baseRecommendations.length > 0
      ? await attachRecommendationReasons(user.id, baseRecommendations)
      : [];

  return (
    <div className="flex flex-1 flex-col gap-16 py-16">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6">
        <HeroImage />
        <div className="bg-background flex flex-col items-center gap-6 text-center">
          <h1 className="text-foreground text-3xl font-semibold tracking-tight">
            {ja.home.intro.title}
          </h1>
          <p className="text-muted-foreground max-w-md text-base leading-7">
            {ja.home.intro.description}
          </p>
        </div>
      </div>

      {user && (
        <RecommendedWorksSection
          hasTasteKeywords={tasteKeywords.length > 0}
          recommendations={recommendations}
        />
      )}
    </div>
  );
}
