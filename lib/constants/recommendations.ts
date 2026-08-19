// 取り好みキーワード基準のおすすめ機能(P1-6)まわりで共有する定数。

/** ホーム画面の「おすすめ作品」セクションに表示する最大件数。 */
export const RECOMMENDATION_LIMIT = 8;

/**
 * おすすめ理由の自然文生成(P2-4)に使用する Claude モデル。
 * 与えられたデータを 1〜2 文にまとめるだけの単純な文章生成タスクのため、
 * コストと速度を優先して軽量モデルを使う。
 */
export const RECOMMENDATION_REASON_MODEL = 'claude-haiku-4-5-20251001';
