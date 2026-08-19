// ログイン中ユーザーの好みキーワード(taste keywords)を取得・更新する API。
// このキーワードは今後 AniList の WorkTag(タグ名)と突き合わせて推薦に使う想定
// (P1-6 のコンテンツベース推薦)。現段階では自由入力のまま保存するだけで、
// マッチングロジックは未実装。

import { NextResponse } from 'next/server';

import { MAX_TASTE_KEYWORD_COUNT, MAX_TASTE_KEYWORD_LENGTH } from '@/lib/constants/auth';
import type { TasteKeywordErrorResponse } from '@/lib/types/auth';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/db/client';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json<TasteKeywordErrorResponse>({ error: 'unauthorized' }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { tasteKeywords: true },
  });

  return NextResponse.json({ tasteKeywords: dbUser?.tasteKeywords ?? [] });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json<TasteKeywordErrorResponse>({ error: 'unauthorized' }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const rawKeywords =
    typeof body === 'object' &&
    body !== null &&
    Array.isArray((body as Record<string, unknown>).tasteKeywords)
      ? ((body as Record<string, unknown>).tasteKeywords as unknown[])
      : null;

  if (!rawKeywords) {
    return NextResponse.json<TasteKeywordErrorResponse>({ error: 'generic' }, { status: 400 });
  }

  // 前後の空白を除去し、空文字を除外したうえで、大文字小文字を区別せず重複を排除する。
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const raw of rawKeywords) {
    if (typeof raw !== 'string') continue;
    const keyword = raw.trim();
    if (!keyword) continue;
    if (keyword.length > MAX_TASTE_KEYWORD_LENGTH) {
      return NextResponse.json<TasteKeywordErrorResponse>({ error: 'tooLong' }, { status: 400 });
    }
    const dedupeKey = keyword.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    keywords.push(keyword);
  }

  if (keywords.length > MAX_TASTE_KEYWORD_COUNT) {
    return NextResponse.json<TasteKeywordErrorResponse>({ error: 'tooMany' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { tasteKeywords: keywords },
  });

  return NextResponse.json({ tasteKeywords: keywords });
}
