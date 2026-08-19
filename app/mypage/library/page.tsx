import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ja } from '@/lib/i18n/ja';
import { getCurrentUser } from '@/server/auth/session';
import type { LibraryStatus } from '@/server/db/generated/prisma/enums';

import { LibraryList } from './LibraryList';

export const metadata: Metadata = {
  title: `${ja.mypage.library.title} | 君のアニメは`,
};

const VALID_STATUSES: LibraryStatus[] = ['PLANNING', 'WATCHING', 'COMPLETED', 'ON_HOLD', 'DROPPED'];

function parseStatusFilter(value: string | undefined): LibraryStatus | undefined {
  return VALID_STATUSES.includes(value as LibraryStatus) ? (value as LibraryStatus) : undefined;
}

interface LibraryPageProps {
  searchParams: Promise<{ status?: string }>;
}

// マイページの保管庫一覧画面(P1-8)。状態(お気に入り/視聴中・閲読中/完了/中断/中止)
// ごとにフィルタして表示する。ステータス自体の変更は作品詳細ページの
// LibraryStatusControl(app/works/[id]/LibraryStatusControl.tsx)で行う。
export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const { status: statusParam } = await searchParams;
  const status = parseStatusFilter(statusParam);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          {ja.mypage.library.title}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{ja.mypage.library.description}</p>
      </div>

      <LibraryList userId={user.id} status={status} />
    </div>
  );
}
