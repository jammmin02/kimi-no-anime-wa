// ランキングページ(P1-5)まわりで共有する定数。
//
// ランキングの並び替えは当サービス自身のレビュー/星評価データのみで行い、
// AniList の popularity/averageScore/trending は絶対に使用しない
// (implementation_prompts_ko.md の共通規則・ランキング規則を参照)。

/**
 * ランキングの順位付け対象に含めるために必要な最小レビュー数。
 * これ未満の作品はレビュー数が少なすぎて平均評価が極端な値になりやすく、
 * ランキング全体の信頼性を損なうため、順位付けから外して「情報不足」として
 * 別セクションに分離する。
 */
export const MIN_REVIEW_COUNT_FOR_RANKING = 5;

/** ランキング(順位付け対象)セクション 1 ページあたりの表示件数。 */
export const RANKING_PAGE_SIZE = 20;
