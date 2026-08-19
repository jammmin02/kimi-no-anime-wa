// 対話型おすすめチャットボット(P2-2)。
//
// server/services/claude/recommendationChat.ts が Claude とのやり取り(ツール呼び出しの
// ループ・確認済み id 集合による一次的な検証)を担当するのに対し、このファイルは
// その結果として得られた作品 id を自体 DB に再照会し、画面表示用データ(カバー画像・
// 自体レビュー集計など)を組み立てる「最終的な検証・補強」の役割を持つ。
// 存在しない id が万一残っていても、この再照会で該当行が無いため自然に除外される。

import { MAX_CHAT_HISTORY_MESSAGES } from '@/lib/constants/chat';
import type { ChatHistory, ChatRecommendedWork } from '@/lib/types/chat';
import { prisma } from '@/server/db/client';
import { runRecommendationChatTurn } from '@/server/services/claude/recommendationChat';
import { rankByOwnReviews } from '@/server/services/ranking';

export { ChatServiceError } from '@/server/services/claude/recommendationChat';

export interface ChatTurnResult {
  reply: string;
  history: ChatHistory;
  recommendedWorks: ChatRecommendedWork[];
}

/**
 * 確認済みの作品 id 一覧を自体 DB に再照会し、画面表示用のカード情報を組み立てる。
 * Claude が提示した順序をそのまま維持したいため、rankByOwnReviews の並び替え結果は
 * 評価集計の取得だけに使い、最終的な並び順は workIds の順序に揃える。
 */
async function fetchDisplayWorks(workIds: number[]): Promise<ChatRecommendedWork[]> {
  if (workIds.length === 0) return [];

  const works = await prisma.work.findMany({
    where: { id: { in: workIds } },
    select: {
      id: true,
      type: true,
      titleRomaji: true,
      titleEnglish: true,
      titleNative: true,
      coverImageUrl: true,
    },
  });
  if (works.length === 0) return [];

  const { ranked, insufficient } = await rankByOwnReviews(works);
  const entryByWorkId = new Map(
    [...ranked, ...insufficient].map((entry) => [entry.work.id, entry]),
  );

  return workIds
    .map((id) => entryByWorkId.get(id))
    .filter((entry): entry is NonNullable<typeof entry> => entry != null)
    .map((entry) => ({
      id: entry.work.id,
      type: entry.work.type,
      titleRomaji: entry.work.titleRomaji,
      titleEnglish: entry.work.titleEnglish,
      titleNative: entry.work.titleNative,
      coverImageUrl: entry.work.coverImageUrl,
      averageRating: entry.averageRating,
      reviewCount: entry.reviewCount,
    }));
}

/**
 * チャット 1 ターンを処理する。history が MAX_CHAT_HISTORY_MESSAGES を超える場合は
 * 呼び出し元(app/api/chat/route.ts)で先に弾く前提とする。
 */
export async function processChatMessage(
  history: ChatHistory,
  message: string,
): Promise<ChatTurnResult> {
  const trimmedHistory =
    history.length > MAX_CHAT_HISTORY_MESSAGES
      ? history.slice(-MAX_CHAT_HISTORY_MESSAGES)
      : history;

  const {
    replyText,
    history: nextHistory,
    recommendedWorkIds,
  } = await runRecommendationChatTurn(trimmedHistory, message);
  const recommendedWorks = await fetchDisplayWorks(recommendedWorkIds);

  return { reply: replyText, history: nextHistory, recommendedWorks };
}
