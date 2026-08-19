import Link from 'next/link';
import type { Metadata } from 'next';

import { RankingEntryRow } from '@/components/ranking/RankingEntryRow';
import { buttonVariants } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { RANKING_PAGE_SIZE } from '@/lib/constants/ranking';
import { cn } from '@/lib/utils/cn';
import { ja } from '@/lib/i18n/ja';
import { prisma } from '@/server/db/client';
import { computeRankingChanges } from '@/server/services/rankingChanges';
import { fetchRanking } from '@/server/services/ranking';
import type { Season } from '@/server/db/generated/prisma/enums';

export const metadata: Metadata = {
  title: `${ja.ranking.anime.title} | 君のアニメは`,
};

interface AnimeRankingPageProps {
  searchParams: Promise<{ genre?: string; season?: string; year?: string; page?: string }>;
}

const SEASONS: Season[] = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];

function parseSeasonFilter(value: string | undefined): Season | undefined {
  return SEASONS.includes(value as Season) ? (value as Season) : undefined;
}

// フィルタ/ページ状態を維持したままランキングページへのリンクを組み立てるヘルパー。
function animeRankingHref(params: {
  genre?: string;
  season?: Season;
  year?: number;
  page?: number;
}): string {
  const query = new URLSearchParams();
  if (params.genre) query.set('genre', params.genre);
  if (params.season) query.set('season', params.season);
  if (params.year) query.set('year', String(params.year));
  if (params.page && params.page > 1) query.set('page', String(params.page));
  const qs = query.toString();
  return qs ? `/ranking/anime?${qs}` : '/ranking/anime';
}

// アニメランキングページ(P1-5)。
// ジャンル/シーズンフィルタのみを提供し、並び替えは fetchRanking() が
// 当サービスのレビュー/星評価データのみで計算した結果をそのまま使う。
// 国別比較は Phase 3 項目のためここでは扱わない。
export default async function AnimeRankingPage({ searchParams }: AnimeRankingPageProps) {
  const params = await searchParams;
  const genre = params.genre && params.genre.length > 0 ? params.genre : undefined;
  const season = parseSeasonFilter(params.season);
  const seasonYear = params.year && /^\d+$/.test(params.year) ? Number(params.year) : undefined;
  const requestedPage = Math.max(1, Number(params.page) || 1);

  // ジャンル/年の選択肢は、実際に同期済みのアニメ作品が持つ値から動的に集計する
  // (genres は文字列配列カラムのため unnest して重複排除する)。
  const [genreRows, yearRows, { ranked, insufficient }] = await Promise.all([
    prisma.$queryRaw<
      { genre: string }[]
    >`SELECT DISTINCT genre FROM works, unnest(genres) AS genre WHERE type = 'ANIME' ORDER BY genre`,
    prisma.$queryRaw<
      { season_year: number }[]
    >`SELECT DISTINCT season_year FROM works WHERE type = 'ANIME' AND season_year IS NOT NULL ORDER BY season_year DESC`,
    fetchRanking({ type: 'ANIME', genre, season, seasonYear }),
  ]);

  const totalPages = Math.max(1, Math.ceil(ranked.length / RANKING_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const rankOffset = (page - 1) * RANKING_PAGE_SIZE;
  const pageEntries = ranked.slice(rankOffset, rankOffset + RANKING_PAGE_SIZE);

  // P2-6: 前日比の順位変動は、スナップショットと同じ条件(絞り込み無しの全体順位)
  // でしか意味を持たないため、ジャンル/シーズン/年フィルタを適用中は計算・表示しない。
  const hasFilters = Boolean(genre || season || seasonYear);
  const rankingChanges = hasFilters
    ? new Map<number, number>()
    : await computeRankingChanges(
        'ANIME',
        pageEntries.map((entry, index) => ({
          workId: entry.work.id,
          rank: rankOffset + index + 1,
        })),
      );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          {ja.ranking.anime.title}
        </h1>
        <p className="text-muted-foreground text-sm">{ja.ranking.anime.description}</p>
        <p className="text-muted-foreground mt-1 text-xs">{ja.ranking.common.methodologyNote}</p>
      </header>

      <div className="flex flex-col gap-3">
        {/* シーズンフィルタ */}
        <div className="flex flex-wrap gap-2">
          <Link
            href={animeRankingHref({ genre, year: seasonYear })}
            className={buttonVariants({ variant: !season ? 'primary' : 'outline', size: 'sm' })}
          >
            {ja.ranking.anime.seasonFilterAll}
          </Link>
          {SEASONS.map((seasonOption) => (
            <Link
              key={seasonOption}
              href={animeRankingHref({ genre, season: seasonOption, year: seasonYear })}
              className={buttonVariants({
                variant: season === seasonOption ? 'primary' : 'outline',
                size: 'sm',
              })}
            >
              {ja.works.detail.seasonNames[seasonOption]}
            </Link>
          ))}
        </div>

        {/* 年フィルタ */}
        {yearRows.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={animeRankingHref({ genre, season })}
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-medium',
                !seasonYear
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {ja.ranking.anime.yearFilterAll}
            </Link>
            {yearRows.map((row) => (
              <Link
                key={row.season_year}
                href={animeRankingHref({ genre, season, year: row.season_year })}
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-medium',
                  seasonYear === row.season_year
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {ja.ranking.anime.yearLabel(row.season_year)}
              </Link>
            ))}
          </div>
        )}

        {/* ジャンルフィルタ */}
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={animeRankingHref({ season, year: seasonYear })}
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-medium',
              !genre ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}
          >
            {ja.ranking.anime.genreFilterAll}
          </Link>
          {genreRows.map((row) => (
            <Link
              key={row.genre}
              href={animeRankingHref({ genre: row.genre, season, year: seasonYear })}
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

      {ranked.length === 0 ? (
        <EmptyState
          title={ja.ranking.common.empty.title}
          description={ja.ranking.common.empty.description}
        />
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {pageEntries.map((entry, index) => (
              <RankingEntryRow
                key={entry.work.id}
                entry={entry}
                rank={rankOffset + index + 1}
                rankChange={rankingChanges.get(entry.work.id)}
              />
            ))}
          </ul>

          {/* ページネーション(作品一覧ページと同じパターン) */}
          <div className="flex items-center justify-center gap-4">
            {page > 1 ? (
              <Link
                href={animeRankingHref({ genre, season, year: seasonYear, page: page - 1 })}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                {ja.ranking.common.pagination.prev}
              </Link>
            ) : (
              <span
                className={buttonVariants({
                  variant: 'outline',
                  size: 'sm',
                  className: 'pointer-events-none opacity-50',
                })}
              >
                {ja.ranking.common.pagination.prev}
              </span>
            )}
            <span className="text-muted-foreground text-sm">
              {ja.ranking.common.pagination.pageOf(page, totalPages)}
            </span>
            {page < totalPages ? (
              <Link
                href={animeRankingHref({ genre, season, year: seasonYear, page: page + 1 })}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                {ja.ranking.common.pagination.next}
              </Link>
            ) : (
              <span
                className={buttonVariants({
                  variant: 'outline',
                  size: 'sm',
                  className: 'pointer-events-none opacity-50',
                })}
              >
                {ja.ranking.common.pagination.next}
              </span>
            )}
          </div>
        </>
      )}

      {/* レビュー数が最小件数(MIN_REVIEW_COUNT_FOR_RANKING)に満たない作品は、
          ランキング上位に紛れ込んで見え方が歪む/ランキングが薄く見えるのを避けるため、
          順位を付けずにこの「情報不足」セクションへ分離して表示する。 */}
      {insufficient.length > 0 && (
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-foreground text-lg font-semibold">
              {ja.ranking.common.insufficientData.sectionTitle}
            </h2>
            <p className="text-muted-foreground text-sm">
              {ja.ranking.common.insufficientData.sectionDescription}
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {insufficient.map((entry) => (
              <RankingEntryRow key={entry.work.id} entry={entry} rank={null} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
