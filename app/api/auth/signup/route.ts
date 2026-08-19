// 会員登録 API。
// メールアドレス重複チェック → パスワードを bcrypt でハッシュ化 → ユーザー作成 →
// セッション Cookie 発行、の順で処理する。ソーシャルログインは実装しない。

import { NextResponse } from 'next/server';

import { hashPassword } from '@/server/auth/password';
import { setSessionCookie } from '@/server/auth/session';
import { validateSignupInput } from '@/server/auth/validation';
import { prisma } from '@/server/db/client';
import type { AuthUser, SignupErrorResponse } from '@/lib/types/auth';

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json<SignupErrorResponse>({ error: 'generic' }, { status: 400 });
  }

  const { email, password, nickname } = body as Record<string, unknown>;
  const { fieldErrors, value } = validateSignupInput({ email, password, nickname });

  if (!value) {
    return NextResponse.json<SignupErrorResponse>(
      { error: 'validation', fieldErrors },
      { status: 400 },
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email: value.email } });
  if (existingUser) {
    return NextResponse.json<SignupErrorResponse>(
      { error: 'validation', fieldErrors: { email: 'emailTaken' } },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(value.password);
  const user = await prisma.user.create({
    data: {
      email: value.email,
      passwordHash,
      nickname: value.nickname,
      tasteKeywords: [],
    },
  });

  const authUser: AuthUser = { id: user.id, email: user.email, nickname: user.nickname };
  await setSessionCookie(authUser);

  return NextResponse.json<{ user: AuthUser }>({ user: authUser }, { status: 201 });
}
