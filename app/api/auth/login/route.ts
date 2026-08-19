// ログイン API。
// メールアドレスでユーザーを検索し、bcrypt でパスワードを検証してからセッション
// Cookie を発行する。ユーザーが存在しない場合とパスワードが違う場合を区別せず、
// どちらも 'invalidCredentials' として返す(メールアドレスの登録有無を推測されないようにする)。

import { NextResponse } from 'next/server';

import { DUMMY_PASSWORD_HASH, verifyPassword } from '@/server/auth/password';
import { setSessionCookie } from '@/server/auth/session';
import { validateLoginInput } from '@/server/auth/validation';
import { prisma } from '@/server/db/client';
import type { AuthUser, LoginErrorResponse } from '@/lib/types/auth';

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const input = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};

  const value = validateLoginInput({ email: input.email, password: input.password });
  if (!value) {
    return NextResponse.json<LoginErrorResponse>({ error: 'invalidCredentials' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: value.email } });
  // ユーザーが存在しない場合もダミーハッシュに対して bcrypt.compare を実行し、
  // 応答時間の差からメールアドレスの登録有無が推測されないようにする。
  const isValidPassword = await verifyPassword(
    value.password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user || !isValidPassword) {
    return NextResponse.json<LoginErrorResponse>({ error: 'invalidCredentials' }, { status: 401 });
  }

  const authUser: AuthUser = { id: user.id, email: user.email, nickname: user.nickname };
  await setSessionCookie(authUser);

  return NextResponse.json<{ user: AuthUser }>({ user: authUser }, { status: 200 });
}
