// 対話型おすすめチャットボット(P2-2)まわりで共有する定数。

/** チャットの会話に使用する Claude モデル。自然言語検索(P2-1)の SEARCH_MODEL と揃えている。 */
export const CHAT_MODEL = 'claude-opus-5';

/** ユーザーが 1 回の発言として送信できる最大文字数。 */
export const MAX_CHAT_MESSAGE_LENGTH = 500;

/**
 * クライアントから送り返してもらう会話履歴(Anthropic のメッセージ配列)の最大要素数。
 * このアプリはサーバー側に会話状態を持たないステートレス方式のため、毎回クライアントが
 * 履歴全体を送り返す必要があるが、無制限に肥大化した履歴が送られてくることを防ぐ上限。
 */
export const MAX_CHAT_HISTORY_MESSAGES = 60;

/** search_db_works ツール 1 回の呼び出しで Claude に返す候補作品の最大件数。 */
export const CHAT_SEARCH_CANDIDATE_LIMIT = 8;

/**
 * 1 ターンあたり、Claude がツール(DB 検索/おすすめ提示)を呼び出せる最大回数。
 * ここに達しても最終的な回答(テキスト or おすすめ提示)が得られない場合は、
 * フォールバックの案内文を返す(無限ループ防止)。
 */
export const CHAT_MAX_TOOL_ITERATIONS = 4;

/** Claude の応答に使う最大出力トークン数。会話の返答は短文のため十分な値にしている。 */
export const CHAT_MAX_OUTPUT_TOKENS = 4096;
