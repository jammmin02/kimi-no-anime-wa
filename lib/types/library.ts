// 保管庫(お気に入り/視聴・閲読状態)機能(P1-8)で API Route Handler とクライアント
// コンポーネントの両方から共有する型定義。

export type LibraryErrorCode = 'unauthorized' | 'invalidStatus' | 'notFound' | 'generic';

/** PUT/DELETE /api/works/[id]/library が失敗時に返すレスポンスの形。 */
export interface LibraryErrorResponse {
  error: LibraryErrorCode;
}
