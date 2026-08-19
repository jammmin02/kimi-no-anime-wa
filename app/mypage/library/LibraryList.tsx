import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ja } from '@/lib/i18n/ja';
import { cn } from '@/lib/utils/cn';
import { prisma } from '@/server/db/client';
import type { LibraryStatus } from '@/server/db/generated/prisma/enums';

const MESSAGES = ja.mypage.library;
const STATUSES: LibraryStatus[] = ['PLANNING', 'WATCHING', 'COMPLETED', 'ON_HOLD', 'DROPPED'];

export interface LibraryListProps {
  userId: number;
  /** 状態別フィルタ(未指定ならすべて表示)。 */
  status?: LibraryStatus;
}

function pickDisplayTitle(work: {
  titleNative: string | null;
  titleRomaji: string | null;
  titleEnglish: string | null;
}): string {
  return work.titleNative ?? work.titleRomaji ?? work.titleEnglish ?? '無題';
}

function libraryHref(status?: LibraryStatus): string {
  return status ? `/mypage/library?status=${status}` : '/mypage/library';
}

// マイページの保管庫一覧(P1-8)。状態別フィルタタブ + 一覧を表示する。
// ステータス自体の変更は作品詳細ページの LibraryStatusControl で行う想定のため、
// ここでは表示とフィルタのみを提供する。見出し(タイトル/説明文)は呼び出し元の
// app/mypage/library/page.tsx 側で表示するため、ここでは持たない。
export async function LibraryList({ userId, status }: LibraryListProps) {
  const entries = await prisma.libraryEntry.findMany({
    where: { userId, ...(status ? { status } : {}) },
    include: {
      work: {
        select: {
          id: true,
          type: true,
          titleRomaji: true,
          titleEnglish: true,
          titleNative: true,
          coverImageUrl: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        <Link
          href={libraryHref()}
          className={cn(
            'rounded-full px-2.5 py-0.5 text-xs font-medium',
            !status ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
          )}
        >
          {MESSAGES.filterAll}
        </Link>
        {STATUSES.map((option) => (
          <Link
            key={option}
            href={libraryHref(option)}
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-medium',
              status === option
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {MESSAGES.statusFilterLabels[option]}
          </Link>
        ))}
      </div>

      {entries.length === 0 ? (
        <EmptyState title={MESSAGES.empty.title} description={MESSAGES.empty.description} />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Link
                href={`/works/${entry.work.id}`}
                className="border-border bg-background hover:border-primary flex flex-col gap-2 rounded-lg border p-2 transition-colors"
              >
                {entry.work.coverImageUrl ? (
                  // AniList の画像を直接 hotlink する方針のため通常の img 要素を使う。
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.work.coverImageUrl}
                    alt=""
                    className="h-32 w-full rounded object-cover"
                  />
                ) : (
                  <div className="bg-muted h-32 w-full rounded" aria-hidden />
                )}
                <Badge
                  variant={entry.work.type === 'ANIME' ? 'primary' : 'secondary'}
                  className="self-start"
                >
                  {MESSAGES.statusFilterLabels[entry.status]}
                </Badge>
                <p className="text-foreground line-clamp-2 text-sm font-medium">
                  {pickDisplayTitle(entry.work)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
