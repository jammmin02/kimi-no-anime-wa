// レビュー/コメント/通報(P1-4)関連で API Route Handler とクライアント
// コンポーネントの両方から共有する型定義。
// auth.ts と同様、フィールドエラーは文言そのものではなく「コード」として返し、
// 実際の表示文言は必ずクライアント側で lib/i18n/ja.ts を経由して解決する。

export type ReviewErrorCode =
  'unauthorized' | 'invalidRating' | 'bodyRequired' | 'bodyTooLong' | 'generic';

/** POST /api/works/[id]/reviews が失敗時に返すレスポンスの形。 */
export interface ReviewErrorResponse {
  error: ReviewErrorCode;
}

export type CommentErrorCode =
  'unauthorized' | 'bodyRequired' | 'bodyTooLong' | 'notFound' | 'generic';

/** POST /api/reviews/[id]/comments が失敗時に返すレスポンスの形。 */
export interface CommentErrorResponse {
  error: CommentErrorCode;
}

export type ReportErrorCode =
  'unauthorized' | 'reasonRequired' | 'alreadyReported' | 'notFound' | 'generic';

/** POST /api/reviews/[id]/report が失敗時に返すレスポンスの形。 */
export interface ReportErrorResponse {
  error: ReportErrorCode;
}
