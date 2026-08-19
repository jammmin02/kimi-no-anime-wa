// ============================================================================
// AniList バッチ同期スクリプト(手動実行用エントリーポイント)。
//
// 実行方法:
//   npm run sync:anilist
//
// 重要: これはユーザーがページを開くたびに AniList API を呼び出す仕組みではない。
// このスクリプトを定期的に実行することで、AniList のデータを自前 DB(作品マスター
// テーブル)にキャッシュするバッチジョブである。
// 現段階(P0-3)ではローカルから手動実行できるところまでを用意する。実際の
// スケジューリング(cron / EventBridge 等)は P0-4 で別途対応する。
//
// 実体のロジック(GraphQL 取得・レートリミット対応・DB へのマッピング/保存)は
// server/services/anilist/ 配下にあり、このファイルはそれを呼び出す薄いラッパー。
// ============================================================================
import { runAniListSync } from '../server/services/anilist/sync.mts';

runAniListSync()
  .then(() => {
    console.log('[anilist] 同期スクリプトが正常に終了しました。');
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error('[anilist] 同期スクリプトが失敗しました:', error);
    process.exit(1);
  });
