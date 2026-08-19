// ログアウト API。セッション Cookie を削除するだけの単純な処理。

import { NextResponse } from 'next/server';

import { clearSessionCookie } from '@/server/auth/session';

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
