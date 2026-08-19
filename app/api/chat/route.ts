// 対話型おすすめチャットボット(P2-2)の API ルート。
//
// このアプリはステートレスなセッション方式(server/auth/session.ts 参照)を採用しており、
// 会話専用のサーバーサイド状態を持たない。そのため会話履歴(history)は毎回クライアントから
// 送り返してもらい、そのまま次回のリクエストに使う(Claude Messages API 自体もステートレス
// なので、この方式は自然に合致する)。ログイン必須の機能ではないため認証チェックは行わない。

import { NextResponse } from 'next/server';

import { MAX_CHAT_HISTORY_MESSAGES, MAX_CHAT_MESSAGE_LENGTH } from '@/lib/constants/chat';
import type { ChatErrorResponse, ChatHistory, ChatResponseBody } from '@/lib/types/chat';
import { ChatServiceError, processChatMessage } from '@/server/services/chat';

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const fields = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};

  const message = typeof fields.message === 'string' ? fields.message.trim() : '';
  const history: ChatHistory = Array.isArray(fields.history) ? (fields.history as ChatHistory) : [];

  if (!message) {
    return NextResponse.json<ChatErrorResponse>({ error: 'generic' }, { status: 400 });
  }
  if (message.length > MAX_CHAT_MESSAGE_LENGTH) {
    return NextResponse.json<ChatErrorResponse>({ error: 'messageTooLong' }, { status: 400 });
  }
  if (history.length > MAX_CHAT_HISTORY_MESSAGES) {
    return NextResponse.json<ChatErrorResponse>({ error: 'historyTooLong' }, { status: 400 });
  }

  try {
    const result = await processChatMessage(history, message);
    return NextResponse.json<ChatResponseBody>(result);
  } catch (error) {
    // Claude API の呼び出し失敗(レートリミット・接続エラー等)はここで捕捉し、
    // 呼び出し元にはエラーコードのみを返す(文言は画面側で ja.ts から解決する)。
    const code = error instanceof ChatServiceError ? error.code : 'generic';
    const status = code === 'rateLimited' ? 429 : 502;
    return NextResponse.json<ChatErrorResponse>({ error: code }, { status });
  }
}
