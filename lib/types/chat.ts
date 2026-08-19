// 対話型おすすめチャットボット(P2-2)関連で、サービス層と画面(app/chat)の間で
// 共有する型定義。会話履歴は Claude Messages API とそのまま往復させる必要があるため
// (tool_use/tool_result を含む)、履歴の型は @anthropic-ai/sdk の MessageParam を
// 型のみ import して再利用する(クライアントバンドルにも SDK 本体は含まれない)。

import type Anthropic from '@anthropic-ai/sdk';

export type ChatErrorCode =
  'messageTooLong' | 'historyTooLong' | 'rateLimited' | 'claudeUnavailable' | 'generic';

/** 会話履歴。Claude Messages API にそのまま渡し・受け取りできる形。 */
export type ChatHistory = Anthropic.MessageParam[];

/**
 * チャット画面に「おすすめカード」として表示する作品情報。
 * Claude の応答をそのまま使うのではなく、必ず自体 DB への再照会で検証・補強した
 * 結果のみをこの型として返す(server/services/chat.ts 参照)。
 */
export interface ChatRecommendedWork {
  id: number;
  type: 'ANIME' | 'MANGA';
  titleRomaji: string | null;
  titleEnglish: string | null;
  titleNative: string | null;
  coverImageUrl: string | null;
  /** 自体レビューの平均評価(1〜10 スケール)。レビューが 1 件も無い場合は null。 */
  averageRating: number | null;
  reviewCount: number;
}

export interface ChatRequestBody {
  message: string;
  history: ChatHistory;
}

export interface ChatResponseBody {
  /** ユーザーに表示する Claude の返答テキスト。 */
  reply: string;
  /** 次回のリクエストにそのまま渡すべき、更新後の会話履歴。 */
  history: ChatHistory;
  recommendedWorks: ChatRecommendedWork[];
}

export interface ChatErrorResponse {
  error: ChatErrorCode;
}
