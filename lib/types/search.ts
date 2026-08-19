// 自然言語検索(P2-1)関連で、サービス層と画面(app/search/page.tsx)の間で共有する型定義。
// reviews.ts 等と同様、エラーは文言そのものではなく「コード」として扱い、
// 実際の表示文言は必ず lib/i18n/ja.ts を経由して解決する。

export type SearchErrorCode = 'queryTooLong' | 'rateLimited' | 'claudeUnavailable' | 'generic';
