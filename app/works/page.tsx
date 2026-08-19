import Link from 'next/link';
import type { Metadata } from 'next';

import { Badge } from '@/components/ui/Badge';
import { buttonVariants } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { WORKS_PAGE_SIZE } from '@/lib/constants/works';
import { cn } from '@/lib/utils/cn';
import { ja } from '@/lib/i18n/ja';
import { prisma } from '@/server/db/client';
import type { WorkType } from '@/server/db/generated/prisma/enums';

export const metadata: Metadata = {
  title: `${ja.works.list.title} | 君のアニメは`,
};

interface WorksListPageProps {
  searchParams: Promise<{ type?: string; genre?: string; page?: string }>;
}

const WORK_TYPES: WorkType[] = ['ANIME', 'MANGA'];

function parseTypeFilter(value: string | undefined): WorkType | undefined {
  return value === 'ANIME' || value === 'MANGA' ? value : undefined;
}

// フィルタ/ページ状態を維持したまま一覧ページへのリンクを組み立てるヘルパー。
// (パラメータが undefined のキーはクエリ文字列から除外する)
function worksHref(params: { type?: string; genre?: string; page?: number }): string {
  const query = new URLSearchParams();
  if (params.type) query.set('type', params.type);
  if (params.genre) query.set('genre', params.genre);
  if (params.page && params.page > 1) query.set('page', String(params.page));
  const qs = query.toString();
  return qs ? `/works?${qs}` : '/works';
}

function pickDisplayTitle(work: {
  titleNative: string | null;
  titleRomaji: string | null;
  titleEnglish: string | null;
}): string {
  return work.titleNative ?? work.titleRomaji ?? work.titleEnglish ?? '無題';
}

// 作品一覧ページ(P1-2)。
// タイプ(アニメ/マンガ)フィルタ・ジャンルフィルタ・ページネーションのみを提供する。
// レビュー/評価やランキング、シリーズ接続 UI はここでは扱わない(それぞれ別プロンプトの範囲)。
export default async function WorksListPage({ searchParams }: WorksListPageProps) {
  const params = await searchParams;
  const type = parseTypeFilter(params.type);
  const genre = params.genre && params.genre.length > 0 ? params.genre : undefined;
  const requestedPage = Math.max(1, Number(params.page) || 1);

  const where = {
    ...(type ? { type } : {}),
    ...(genre ? { genres: { has: genre } } : {}),
  };

  // ジャンルフィルタの選択肢は、実際に同期済みの作品が持つジャンル値から動的に集計する
  // (genres は文字列配列カラムのため unnest して重複排除する)。
  const [genreRows, totalCount] = await Promise.all([
    prisma.$queryRaw<
      { genre: string }[]
    >`SELECT DISTINCT genre FROM works, unnest(genres) AS genre ORDER BY genre`,
    prisma.work.count({ where }),
  ]);

  // 実際の件数に基づいて範囲外のページ番号(例: ?page=999)を最終ページに丸め込む。
  // これをしないと、件数超過分の skip で findMany が 0 件を返し、実際は該当作品が
  // あるのに「該当する作品が見つかりません」の空状態が誤って表示されてしまう。
  const totalPages = Math.max(1, Math.ceil(totalCount / WORKS_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const works = await prisma.work.findMany({
    where,
    // AniList の popularity/averageScore/trending はランキング用途に使わないため、
    // 一覧の並び順にも使用しない。ここではタイトルの五十音/アルファベット順に統一する。
    orderBy: [{ titleRomaji: 'asc' }],
    skip: (page - 1) * WORKS_PAGE_SIZE,
    take: WORKS_PAGE_SIZE,
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">{ja.works.list.title}</h1>
        <p className="text-muted-foreground text-sm">{ja.works.list.resultCount(totalCount)}</p>
      </header>

      <div className="flex flex-col gap-3">
        {/* タイプフィルタ */}
        <div className="flex flex-wrap gap-2">
          <Link
            href={worksHref({ genre })}
            className={buttonVariants({ variant: !type ? 'primary' : 'outline', size: 'sm' })}
          >
            {ja.works.list.typeFilterAll}
          </Link>
          {WORK_TYPES.map((workType) => (
            <Link
              key={workType}
              href={worksHref({ type: workType, genre })}
              className={buttonVariants({
                variant: type === workType ? 'primary' : 'outline',
                size: 'sm',
              })}
            >
              {ja.works.list.typeFilterLabels[workType]}
            </Link>
          ))}
        </div>

        {/* ジャンルフィルタ */}
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={worksHref({ type })}
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-medium',
              !genre ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}
          >
            {ja.works.list.genreFilterAll}
          </Link>
          {genreRows.map((row) => (
            <Link
              key={row.genre}
              href={worksHref({ type, genre: row.genre })}
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-medium',
                genre === row.genre
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {row.genre}
            </Link>
          ))}
        </div>
      </div>

      {works.length === 0 ? (
        <EmptyState
          title={ja.works.list.empty.title}
          description={ja.works.list.empty.description}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {works.map((work) => (
              <Link key={work.id} href={`/works/${work.id}`}>
                <Card className="h-full overflow-hidden">
                  {work.coverImageUrl ? (
                    // AniList の画像を直接 hotlink する方針のため通常の img 要素を使う。
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={work.coverImageUrl} alt="" className="h-48 w-full object-cover" />
                  ) : (
                    <div className="bg-muted h-48 w-full" aria-hidden />
                  )}
                  <CardContent className="flex flex-col gap-1.5 pt-4">
                    <Badge
                      variant={work.type === 'ANIME' ? 'primary' : 'secondary'}
                      className="self-start"
                    >
                      {ja.works.list.typeFilterLabels[work.type]}
                    </Badge>
                    <p className="text-foreground line-clamp-2 text-sm font-medium">
                      {pickDisplayTitle(work)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* ページネーション */}
          <div className="flex items-center justify-center gap-4">
            {page > 1 ? (
              <Link
                href={worksHref({ type, genre, page: page - 1 })}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                {ja.works.list.pagination.prev}
              </Link>
            ) : (
              <span
                className={buttonVariants({
                  variant: 'outline',
                  size: 'sm',
                  className: 'pointer-events-none opacity-50',
                })}
              >
                {ja.works.list.pagination.prev}
              </span>
            )}
            <span className="text-muted-foreground text-sm">
              {ja.works.list.pagination.pageOf(page, totalPages)}
            </span>
            {page < totalPages ? (
              <Link
                href={worksHref({ type, genre, page: page + 1 })}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                {ja.works.list.pagination.next}
              </Link>
            ) : (
              <span
                className={buttonVariants({
                  variant: 'outline',
                  size: 'sm',
                  className: 'pointer-events-none opacity-50',
                })}
              >
                {ja.works.list.pagination.next}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
