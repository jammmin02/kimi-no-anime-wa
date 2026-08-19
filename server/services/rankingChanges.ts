// ランキング順位の前日比変動計算(P2-6)。
//
// server/services/rankingSnapshot.ts が保存した過去のスナップショットと、ランキング
// ページが毎回計算するライブな順位を突き合わせて「前日比の順位上昇/下降」を求める。
//
// 「前日」とは厳密には「今日より前の、直近のスナップショット日」を指す。cron の実行
// タイミング(今日分のスナップショットが既に保存済みかどうか)に関わらず常に「今日より
// 前」の最新スナップショットを基準にすることで、ページを見るタイミングによらず
// 「前日比」の意味を安定させる。
//
// 基準にできるスナップショット日が 1 つも無い場合(サービス開始当日など、スナップ
// ショットが 0 件または今日分の 1 件しか無い場合)は、空の Map を返す。呼び出し側は
// これを「変動バッジを一切表示しない」の意味で扱うこと。

import type { WorkType } from '@/server/db/generated/prisma/enums';
import { prisma } from '@/server/db/client';
import { toUtcDateOnly } from '@/server/services/rankingSnapshot';

export interface RankingChangeInput {
  workId: number;
  /** 現在のライブな順位(1 始まり)。 */
  rank: number;
}

/**
 * 作品 ID → 前日比の順位変動。プラスは順位上昇(数字が小さくなった)、マイナスは
 * 下降、0 は変動なし。基準となる前日スナップショットに存在しない作品(新規に順位付け
 * 対象になった作品など)は、この Map に含まれない。
 */
export type RankingChangeMap = Map<number, number>;

/**
 * 指定した作品種別・現在の順位一覧について、前日比の順位変動を計算する。
 */
export async function computeRankingChanges(
  type: WorkType,
  currentRanks: RankingChangeInput[],
  now: Date = new Date(),
): Promise<RankingChangeMap> {
  if (currentRanks.length === 0) {
    return new Map();
  }

  const today = toUtcDateOnly(now);

  // 「今日より前」で最も新しいスナップショット日を探す。見つからなければ比較不能。
  const previousSnapshotDateRow = await prisma.rankingSnapshot.findFirst({
    where: { type, snapshotDate: { lt: today } },
    orderBy: { snapshotDate: 'desc' },
    select: { snapshotDate: true },
  });

  if (!previousSnapshotDateRow) {
    return new Map();
  }

  const previousRanks = await prisma.rankingSnapshot.findMany({
    where: {
      type,
      snapshotDate: previousSnapshotDateRow.snapshotDate,
      workId: { in: currentRanks.map((entry) => entry.workId) },
    },
    select: { workId: true, rank: true },
  });
  const previousRankByWorkId = new Map(previousRanks.map((row) => [row.workId, row.rank]));

  const changes: RankingChangeMap = new Map();
  for (const current of currentRanks) {
    const previousRank = previousRankByWorkId.get(current.workId);
    if (previousRank == null) continue;
    changes.set(current.workId, previousRank - current.rank);
  }
  return changes;
}
