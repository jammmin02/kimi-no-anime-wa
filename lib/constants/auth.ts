// メール+パスワード方式の自前認証まわりで共有する定数。
// server/auth/ 配下のバリデーション・セッション発行ロジックと、
// app/(signup|login|mypage) 配下のフォームの両方から参照する。

/** パスワードの最小文字数。 */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * パスワードの最大文字数。
 * bcrypt は 72 バイトを超える部分を黙って切り捨てるため、そのことに気づかず
 * 「後半を変えてもログインできてしまう」事態を避けるためにアプリ側でも上限を設ける。
 */
export const MAX_PASSWORD_LENGTH = 72;

/** ニックネームの最大文字数。 */
export const MAX_NICKNAME_LENGTH = 30;

/** ごく簡易なメール形式チェック用の正規表現(厳密な RFC 準拠は目指さない)。 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** セッション情報を保持する Cookie の名前。 */
export const SESSION_COOKIE_NAME = 'kimi_no_anime_wa_session';

/** セッションの有効期間(秒)。30 日。 */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** 取り好みキーワード 1 件あたりの最大文字数。 */
export const MAX_TASTE_KEYWORD_LENGTH = 20;

/** 取り好みキーワードの最大登録件数。 */
export const MAX_TASTE_KEYWORD_COUNT = 20;
