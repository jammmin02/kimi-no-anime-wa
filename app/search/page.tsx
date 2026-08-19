import Link from 'next/link';
import type { Metadata } from 'next';

import { RankingEntryRow } from '@/components/ranking/RankingEntryRow';
import { buttonVariants } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { MAX_SEARCH_QUERY_LENGTH, SEARCH_PAGE_SIZE } from '@/lib/constants/search';
import type { SearchErrorCode } from '@/lib/types/search';
import { ja } from '@/lib/i18n/ja';
import { NaturalLanguageSearchError } from '@/server/services/claude/naturalLanguageSearch';
import {
  searchWorksByNaturalLanguage,
  type NaturalLanguageSearchResult,
} from '@/server/services/search';
import type { WorkType } from '@/server/db/generated/prisma/enums';

export const metadata: Metadata = {
  title: `${ja.search.title} | 君のアニメは`,
};

interface SearchPageProps {
  searchParams: Promise<{ q?: string; type?: string; page?: string }>;
}

function parseTypeFilter(value: string | undefined): WorkType | undefined {
  return value === 'ANIME' || value === 'MANGA' ? value : undefined;
}

// フィルタ/ページ状態を維持したまま検索結果ページへのリンクを組み立てるヘルパー
// (作品一覧/ランキングページと同じパターン)。
function searchHref(params: { q: string; type?: WorkType; page?: number }): string {
  const query = new URLSearchParams();
  query.set('q', params.q);
  if (params.type) query.set('type', params.type);
  if (params.page && params.page > 1) query.set('page', String(params.page));
  return `/search?${query.toString()}`;
}

// 自然言語検索ページ(P2-1)。
// Claude API に候補ジャンル/タグ一覧と自然言語クエリを渡して関連する組み合わせを抽出し、
// その組み合わせで自体 DB を絞り込んだ結果を表示する。並び替えは検索専用のロジックを
// 持たず、server/services/ranking.ts の rankByOwnReviews をそのまま再利用しているため、
// 通常のランキングと全く同じ規則(自体レビュー基準、AniList 人気度は不使用)になる。
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = (params.q ?? '').trim();
  const type = parseTypeFilter(params.type);
  const requestedPage = Math.max(1, Number(params.page) || 1);

  let result: NaturalLanguageSearchResult | null = null;
  let errorCode: SearchErrorCode | null = null;

  if (query.length > MAX_SEARCH_QUERY_LENGTH) {
    errorCode = 'queryTooLong';
  } else if (query.length > 0) {
    try {
      result = await searchWorksByNaturalLanguage({ query, type });
    } catch (error) {
      // Claude API の呼び出し失敗(レートリミット・接続エラー等)はここで捕捉し、
      // 画面をクラッシュさせずにユーザー向けのエラーメッセージへ変換する。
      errorCode = error instanceof NaturalLanguageSearchError ? error.code : 'generic';
    }
  }

  const totalPages = result ? Math.max(1, Math.ceil(result.ranked.length / SEARCH_PAGE_SIZE)) : 1;
  const page = Math.min(requestedPage, totalPages);
  const rankOffset = (page - 1) * SEARCH_PAGE_SIZE;
  const pageEntries = result ? result.ranked.slice(rankOffset, rankOffset + SEARCH_PAGE_SIZE) : [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">{ja.search.title}</h1>
        <p className="text-muted-foreground text-sm">{ja.search.description}</p>
      </header>

      {/* GET フォーム。JS 無しでも動作し、クエリ文字列でブックマーク可能にする
          (作品一覧/ランキングページのフィルタと同じ考え方)。 */}
      <form action="/search" method="get" className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="search-query" className="sr-only">
          {ja.search.formLabel}
        </label>
        <Input
          id="search-query"
          name="q"
          type="text"
          defaultValue={query}
          maxLength={MAX_SEARCH_QUERY_LENGTH}
          placeholder={ja.search.placeholder}
          className="flex-1"
        />
        {type && <input type="hidden" name="type" value={type} />}
        <button type="submit" className={buttonVariants({ variant: 'primary' })}>
          {ja.search.submit}
        </button>
      </form>

      {query.length === 0 ? (
        <EmptyState title={ja.search.noQuery.title} description={ja.search.noQuery.description} />
      ) : errorCode ? (
        <EmptyState title={ja.search.title} description={ja.search.errors[errorCode]} />
      ) : result && result.matchedGenres.length === 0 && result.matchedTags.length === 0 ? (
        <EmptyState title={ja.search.noMatch.title} description={ja.search.noMatch.description} />
      ) : result ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-muted-foreground text-xs">
              {ja.search.matchedFiltersLabel([...result.matchedGenres, ...result.matchedTags])}
            </p>
            <p className="text-muted-foreground text-xs">{ja.search.methodologyNote}</p>
          </div>

          {result.ranked.length === 0 && result.insufficient.length === 0 ? (
            <EmptyState title={ja.search.empty.title} description={ja.search.empty.description} />
          ) : (
            <>
              {pageEntries.length > 0 && (
                <>
                  <ul className="flex flex-col gap-2">
                    {pageEntries.map((entry, index) => (
                      <RankingEntryRow
                        key={entry.work.id}
                        entry={entry}
                        rank={rankOffset + index + 1}
                      />
                    ))}
                  </ul>

                  {/* ページネーション(ランキングページと同じパターン) */}
                  <div className="flex items-center justify-center gap-4">
                    {page > 1 ? (
                      <Link
                        href={searchHref({ q: query, type, page: page - 1 })}
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
                        href={searchHref({ q: query, type, page: page + 1 })}
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

              {/* レビュー数が最小件数に満たない作品は、通常のランキングページと同様に
                  順位を付けずに「情報不足」セクションへ分離して表示する。 */}
              {result.insufficient.length > 0 && (
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
                    {result.insufficient.map((entry) => (
                      <RankingEntryRow key={entry.work.id} entry={entry} rank={null} />
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
