import { notFound } from 'next/navigation';

import { Badge } from '@/components/ui/Badge';
import { ja } from '@/lib/i18n/ja';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/db/client';

import { LibraryStatusControl } from './LibraryStatusControl';
import { ReviewSection } from './reviews/ReviewSection';
import { ReviewSummarySection } from './reviews/ReviewSummarySection';
import { WorkRelationsSection } from './WorkRelationsSection';

interface WorkDetailPageProps {
  params: Promise<{ id: string }>;
}

function pickDisplayTitle(work: {
  titleNative: string | null;
  titleRomaji: string | null;
  titleEnglish: string | null;
}): string {
  return work.titleNative ?? work.titleRomaji ?? work.titleEnglish ?? '無題';
}

// 作品詳細ページ(P1-2 + P1-3 のつながりセクション + P1-4 のレビュー/評価 + P1-8 の保管庫)。
// /works/{DB上のWork.id} でアクセスする(一覧ページ ../page.tsx から遷移する想定)。
export default async function WorkDetailPage({ params }: WorkDetailPageProps) {
  const { id } = await params;
  const workId = Number(id);
  if (!Number.isInteger(workId)) {
    notFound();
  }

  // P1-3 のつながり表示に必要な sourceRelations(この作品を起点とする関係)を
  // targetWork ごと include する。AniList は各作品の relations.edges を
  // その作品自身の同期時にそのまま保存しているため、sourceRelations だけで
  // この作品から見た関係(原作・アニメ化・前作・続編・外伝など)が過不足なく揃う。
  const work = await prisma.work.findUnique({
    where: { id: workId },
    include: {
      tags: { orderBy: { rank: 'desc' } },
      sourceRelations: {
        include: { targetWork: true },
      },
    },
  });

  if (!work) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  const libraryEntry = currentUser
    ? await prisma.libraryEntry.findUnique({
        where: { userId_workId: { userId: currentUser.id, workId: work.id } },
        select: { status: true },
      })
    : null;

  const title = pickDisplayTitle(work);
  const subtitle = work.titleRomaji && work.titleRomaji !== title ? work.titleRomaji : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6">
      <div className="flex flex-col gap-6 sm:flex-row">
        {work.coverImageUrl ? (
          // AniList の画像を直接 hotlink する方針のため通常の img 要素を使う。
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={work.coverImageUrl}
            alt=""
            className="h-64 w-44 flex-none self-start rounded-xl object-cover shadow-md"
          />
        ) : (
          <div className="bg-muted h-64 w-44 flex-none self-start rounded-xl" aria-hidden />
        )}

        <div className="flex flex-col gap-3">
          <Badge variant={work.type === 'ANIME' ? 'primary' : 'secondary'}>
            {ja.works.detail.typeLabels[work.type]}
          </Badge>

          <div>
            <h1 className="text-foreground text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>}
          </div>

          <LibraryStatusControl
            workId={work.id}
            workType={work.type}
            isLoggedIn={Boolean(currentUser)}
            initialStatus={libraryEntry?.status ?? null}
          />

          {work.genres.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-semibold">
                {ja.works.detail.genresTitle}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {work.genres.map((genre) => (
                  <Badge key={genre}>{genre}</Badge>
                ))}
              </div>
            </div>
          )}

          {work.tags.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-semibold">
                {ja.works.detail.tagsTitle}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {work.tags.map((tag) => (
                  <Badge key={tag.id} variant="secondary">
                    {tag.name} {tag.rank}%
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <dl className="text-muted-foreground flex flex-col gap-1 text-sm">
            <div>
              {ja.works.detail.countryLabel}: {ja.works.detail.countryNames[work.countryOfOrigin]}
            </div>
            {work.season && work.seasonYear && (
              <div>
                {ja.works.detail.seasonLabel(
                  ja.works.detail.seasonNames[work.season],
                  work.seasonYear,
                )}
              </div>
            )}
            {work.episodes != null && <div>{ja.works.detail.episodesLabel(work.episodes)}</div>}
            {work.chapters != null && <div>{ja.works.detail.chaptersLabel(work.chapters)}</div>}
            {work.volumes != null && <div>{ja.works.detail.volumesLabel(work.volumes)}</div>}
          </dl>
        </div>
      </div>

      {/* AniList 参考指標セクション。並び替え/ランキングには絶対に使用しない
          (implementation_prompts_ko.md 共通規則参照)。あくまで参考表示のみ。 */}
      {(work.popularity != null || work.averageScore != null || work.trending != null) && (
        <div className="border-border bg-muted flex flex-col gap-1 rounded-lg border p-4">
          <p className="text-foreground text-sm font-semibold">
            {ja.works.detail.referenceInfo.title}
          </p>
          <p className="text-muted-foreground text-xs">
            {ja.works.detail.referenceInfo.description}
          </p>
          <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {work.popularity != null && (
              <span>{ja.works.detail.referenceInfo.popularityLabel(work.popularity)}</span>
            )}
            {work.averageScore != null && (
              <span>{ja.works.detail.referenceInfo.averageScoreLabel(work.averageScore)}</span>
            )}
            {work.trending != null && (
              <span>{ja.works.detail.referenceInfo.trendingLabel(work.trending)}</span>
            )}
          </div>
        </div>
      )}

      <WorkRelationsSection relations={work.sourceRelations} />

      <ReviewSummarySection workId={work.id} workTitle={title} />

      <ReviewSection workId={work.id} />
    </div>
  );
}
