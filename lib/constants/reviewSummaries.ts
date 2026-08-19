// 別点区間別 AI レビュー要約(P2-3)まわりで共有する定数。
// implementation_prompts_ko.md の P2-3 の指示通り、閾値は後から調整しやすいように
// ここに定数として切り出しておく。

/**
 * 要約を表示するために必要な、作品ごとの最小レビュー数(区間合計ではなく作品全体の件数)。
 * これ未満の作品は要約自体を生成/表示せず、「レビューが集まると表示する」旨の
 * 案内のみを出す。
 */
export const MIN_REVIEWS_FOR_SUMMARY = 20;

/** 「高評価」区間とみなす評価(1〜10 スケール)の下限。この値以上を高評価とする。 */
export const HIGH_RATING_BAND_MIN = 8;

/** 「低評価」区間とみなす評価(1〜10 スケール)の上限。この値以下を低評価とする。 */
export const LOW_RATING_BAND_MAX = 4;

/**
 * 要約生成の 1 回の Claude API 呼び出しに渡すレビュー本文の最大件数。
 * 区間内のレビューが非常に多い作品でもプロンプトのトークン量・コストが
 * 際限なく増えないよう、直近のレビューを優先して上限件数で打ち切る。
 */
export const MAX_REVIEWS_PER_SUMMARY_PROMPT = 50;

/** レビュー要約生成に使用する Claude モデル。文章生成タスクのため sonnet を使う。 */
export const REVIEW_SUMMARY_MODEL = 'claude-sonnet-5';
