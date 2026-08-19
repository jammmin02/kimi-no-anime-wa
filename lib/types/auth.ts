// 認証関連で複数箇所(server/auth, app/api/auth/**, app/(signup|login|mypage))から
// 共有する型定義。

/** セッション Cookie(JWT)のペイロードに載せる最小限のユーザー情報。 */
export interface SessionPayload {
  /** User.id を文字列化したもの(JWT の sub クレームの慣例に合わせる)。 */
  sub: string;
  email: string;
  nickname: string;
}

/** ログイン中ユーザーとして画面側に渡す情報。SessionPayload とほぼ同じだが id は number。 */
export interface AuthUser {
  id: number;
  email: string;
  nickname: string;
}

// フィールド単位のエラーは、翻訳済み文言ではなく「コード」を返す。
// サーバー側は言語を意識せず、実際の文言は必ずクライアント側で lib/i18n/ja.ts の
// 対応するキーを引いて表示する(P1-7 での多言語化を見据えた分離)。

export type SignupErrorCode =
  | 'emailInvalid'
  | 'emailTaken'
  | 'passwordTooShort'
  | 'passwordTooLong'
  | 'nicknameRequired'
  | 'nicknameTooLong';

export type LoginErrorCode = 'invalidCredentials';

export type TasteKeywordErrorCode = 'empty' | 'tooLong' | 'tooMany' | 'duplicate';

/** 会員登録フォームのフィールドエラー(コード文字列)。 */
export type SignupFieldErrors = Partial<Record<'email' | 'password' | 'nickname', SignupErrorCode>>;

/** POST /api/auth/signup が失敗時に返すレスポンスの形。 */
export interface SignupErrorResponse {
  error: 'validation' | 'generic';
  fieldErrors?: SignupFieldErrors;
}

/** POST /api/auth/login が失敗時に返すレスポンスの形。 */
export interface LoginErrorResponse {
  error: LoginErrorCode | 'generic';
}

/** GET/PUT /api/user/taste-keywords が失敗時に返すレスポンスの形。 */
export interface TasteKeywordErrorResponse {
  error: TasteKeywordErrorCode | 'unauthorized' | 'generic';
}
