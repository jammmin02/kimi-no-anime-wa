// 自然言語検索(P2-1)まわりで共有する定数。

/** 自然言語検索クエリの最大文字数。 */
export const MAX_SEARCH_QUERY_LENGTH = 200;

/** ジャンル/タグ抽出に使用する Claude モデル。 */
export const SEARCH_MODEL = 'claude-opus-5';

/**
 * Claude に候補として渡すタグ名の最大件数。
 * 自体 DB に同期済みのタグは種類が非常に多くなり得るため、プロンプトの
 * トークン量とコストを抑える目的で、作品への付与件数が多い(≒代表的な)
 * タグを優先して上限件数で打ち切る。
 */
export const MAX_TAGS_FOR_PROMPT = 300;

/** 検索結果(順位付け対象)1 ページあたりの表示件数。 */
export const SEARCH_PAGE_SIZE = 20;
