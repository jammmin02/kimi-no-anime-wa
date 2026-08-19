// ============================================================================
// 日次ランキングスナップショット保存バッチ(手動実行用エントリーポイント)。
//
// 実行方法:
//   npm run snapshot:ranking
//
// マンガ/アニメ各々の現在の自体レビュー基準ランキングを、本日分のスナップショットとして
// DB に保存する(P2-6)。1 日 1 回、cron から定期実行する想定
// (deploy/crontab.example / deploy/snapshot-ranking-cron.sh を参照。P0-4 で用意した
// AniList 同期バッチと同じ「cron → docker compose run」パターンに乗せている)。
//
// 実体のロジックは server/services/rankingSnapshot.ts にあり、このファイルはそれを
// 呼び出す薄いラッパー(scripts/sync-anilist.mts と同じパターン)。
// ============================================================================
import { snapshotCurrentRankings } from '../server/services/rankingSnapshot.ts';

snapshotCurrentRankings()
  .then(() => {
    console.log('[rankingSnapshot] スナップショット保存バッチが正常に終了しました。');
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error('[rankingSnapshot] スナップショット保存バッチが失敗しました:', error);
    process.exit(1);
  });
