import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { buttonVariants } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/db/client';
import { ja } from '@/lib/i18n/ja';

import { TasteKeywordEditor } from './TasteKeywordEditor';

export const metadata: Metadata = {
  title: `${ja.mypage.title} | 君のアニメは`,
};

export default async function MyPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  // タイミングにより、セッション発行後に該当ユーザーが削除されている可能性はゼロではないが、
  // MVP の現段階ではその考慮は行わず、素直に見つからなければ 404 相当としてログインへ戻す。
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { tasteKeywords: true },
  });
  if (!dbUser) {
    redirect('/login');
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">{ja.mypage.title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{ja.mypage.greeting(user.nickname)}</p>
      </div>

      <TasteKeywordEditor initialKeywords={dbUser.tasteKeywords} />

      {/* 保管庫一覧本体は /mypage/library(状態別フィルタ付き)に分離している(P1-8)。 */}
      <Card>
        <CardHeader>
          <CardTitle>{ja.mypage.library.title}</CardTitle>
          <CardDescription>{ja.mypage.library.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/mypage/library"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            {ja.mypage.library.viewAll}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
