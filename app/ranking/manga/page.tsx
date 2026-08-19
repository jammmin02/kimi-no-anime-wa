import Link from 'next/link';
import type { Metadata } from 'next';

import { RankingEntryRow } from '@/components/ranking/RankingEntryRow';
import { buttonVariants } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { RANKING_PAGE_SIZE } from '@/lib/constants/ranking';
import { ja } from '@/lib/i18n/ja';
import { computeRankingChanges } from '@/server/services/rankingChanges';
import { fetchRanking } from '@/server/services/ranking';
import type { WorkCountry } from '@/server/db/generated/prisma/enums';

export const metadata: Metadata = {
  title: `${ja.ranking.manga.title} | 君のアニメは`,
};

interface MangaRankingPageProps {
  searchParams: Promise<{ country?: string; page?: string }>;
}

// マンガランキングで選べる原産国。仕様上ここは KR/JP の 2 択のみとする
// (implementation_prompts_ko.md 参照。アニメ側は原産国のほぼ全てが JP のため対象外)。
const MANGA_COUNTRIES: WorkCountry[] = ['KR', 'JP'];

function parseCountryFilter(value: string | undefined): WorkCountry | undefined {
  return value === 'KR' || value === 'JP' ? value : undefined;
}

// フィルタ/ページ状態を維持したままランキングページへのリンクを組み立てるヘルパー。
function mangaRankingHref(params: { country?: WorkCountry; page?: number }): string {
  const query = new URLSearchParams();
  if (params.country) query.set('country', params.country);
  if (params.page && params.page > 1) query.set('page', String(params.page));
  const qs = query.toString();
  return qs ? `/ranking/manga?${qs}` : '/ranking/manga';
}

// マンガランキングページ(P1-5)。
// countryOfOrigin(KR/JP)フィルタのみを提供し、並び替えは fetchRanking() が
// 当サービスのレビュー/星評価データのみで計算した結果をそのまま使う。
export default async function MangaRankingPage({ searchParams }: MangaRankingPageProps) {
  const params = await searchParams;
  const country = parseCountryFilter(params.country);
  const requestedPage = Math.max(1, Number(params.page) || 1);

  const { ranked, insufficient } = await fetchRanking({ type: 'MANGA', countryOfOrigin: country });

  const totalPages = Math.max(1, Math.ceil(ranked.length / RANKING_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const rankOffset = (page - 1) * RANKING_PAGE_SIZE;
  const pageEntries = ranked.slice(rankOffset, rankOffset + RANKING_PAGE_SIZE);

  // P2-6: 前日比の順位変動は、スナップショットと同じ条件(絞り込み無しの全体順位)
  // でしか意味を持たないため、原産国フィルタを適用中は計算・表示しない。
  const rankingChanges = country
    ? new Map<number, number>()
    : await computeRankingChanges(
        'MANGA',
        pageEntries.map((entry, index) => ({
          workId: entry.work.id,
          rank: rankOffset + index + 1,
        })),
      );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          {ja.ranking.manga.title}
        </h1>
        <p className="text-muted-foreground text-sm">{ja.ranking.manga.description}</p>
        <p className="text-muted-foreground mt-1 text-xs">{ja.ranking.common.methodologyNote}</p>
      </header>

      {/* 原産国フィルタ(KR/JP)。ランキングの並び替え条件には一切関わらず、
          対象作品を絞り込むだけのフィルタである点に注意。 */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={mangaRankingHref({})}
          className={buttonVariants({ variant: !country ? 'primary' : 'outline', size: 'sm' })}
        >
          {ja.ranking.manga.countryFilterAll}
        </Link>
        {MANGA_COUNTRIES.map((countryOption) => (
          <Link
            key={countryOption}
            href={mangaRankingHref({ country: countryOption })}
            className={buttonVariants({
              variant: country === countryOption ? 'primary' : 'outline',
              size: 'sm',
            })}
          >
            {ja.works.detail.countryNames[countryOption]}
          </Link>
        ))}
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
                href={mangaRankingHref({ country, page: page - 1 })}
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
                href={mangaRankingHref({ country, page: page + 1 })}
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
