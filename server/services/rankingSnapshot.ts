// 日次ランキングスナップショット保存バッチ(P2-6)。
//
// マンガ/アニメ各々の「現在の自体レビュー基準ランキング」(fetchRanking() が返す ranked、
// つまり最小レビュー数以上で順位付け対象になった作品のみ)を、1 日 1 回スナップショットと
// して RankingSnapshot テーブルに保存する。情報不足(順位無し)の作品はそもそも順位が
// 無いため保存しない。
//
// 実行方法・cron への登録は scripts/snapshot-ranking.mts / deploy/crontab.example を参照
// (P0-4 の AniList 同期バッチと同じ「cron → docker compose run」パターンに乗せる)。
//
// 前日比の順位変動表示(server/services/rankingChanges.ts)は、ここが保存したスナップ
// ショットと、ランキングページが毎回計算するライブな順位を突き合わせて計算する。
//
// scripts/snapshot-ranking.mts から tsx で直接実行される(Next.js の起動経路を通らない)
// ため、server/services/anilist/sync.mts と同様にここで明示的に .env を読み込む。

import 'dotenv/config';

import type { WorkType } from '@/server/db/generated/prisma/enums';
import { prisma } from '@/server/db/client';
import { fetchRanking } from '@/server/services/ranking';

// スナップショットの対象種別。ランキングページが存在するのはマンガ/アニメの 2 つだけ。
const SNAPSHOT_TYPES: WorkType[] = ['ANIME', 'MANGA'];

/**
 * 任意の Date から「時刻情報を持たない、その日を表す Date」を UTC 基準で作る。
 *
 * サーバーのタイムゾーン設定(ローカル時刻)に依存すると、Postgres の date 型へ
 * 保存・比較する際に日付が前後にずれる恐れがあるため、日付の境界は常に UTC で
 * 統一する(cron の起動時刻そのものはサーバーのタイムゾーン基準でよいが、
 * 「何日分のスナップショットか」を表すこの値だけは UTC で固定する)。
 * 書き込み側(このファイル)・読み込み側(rankingChanges.ts)の両方で必ずこの関数を
 * 経由させ、日付の正規化方法をずらさないこと。
 */
export function toUtcDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * マンガ/アニメ各々の現在のランキング(順位付け対象のみ)を、本日分のスナップショットと
 * して DB に保存する。
 *
 * 同じ日に複数回実行しても、対象日分の既存レコードを一度削除してから作り直すだけなので
 * 安全(冪等)。
 */
export async function snapshotCurrentRankings(now: Date = new Date()): Promise<void> {
  const snapshotDate = toUtcDateOnly(now);

  for (const type of SNAPSHOT_TYPES) {
    const { ranked } = await fetchRanking({ type });

    await prisma.$transaction([
      prisma.rankingSnapshot.deleteMany({ where: { type, snapshotDate } }),
      prisma.rankingSnapshot.createMany({
        data: ranked.map((entry, index) => ({
          workId: entry.work.id,
          type,
          snapshotDate,
          // ranked は既に順位順にソート済みなので、配列の位置がそのまま順位(1 始まり)になる。
          rank: index + 1,
        })),
      }),
    ]);

    console.log(
      `[rankingSnapshot] ${type}: ${snapshotDate.toISOString().slice(0, 10)} 分として ` +
        `${ranked.length} 件の順位を保存しました。`,
    );
  }
}
