// メール+パスワード方式の自前認証における「セッション」の実体。
//
// サーバー側にセッションテーブルを持たず、ユーザー情報を JWT に署名して
// httpOnly Cookie にそのまま保存するステートレスな方式にしている
// (implementation_prompts_ko.md 共通規則: 「JWT または セッション Cookie 方式」の
// うち、チーム内に既存の方式が無かったためこの形で開始する)。
// JWT の署名・検証には Edge/Node どちらでも動く `jose` を使う。

import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';

import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/constants/auth';
import type { AuthUser, SessionPayload } from '@/lib/types/auth';

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // .env.example / .env に既定のプレースホルダーがあるはずなので、ここに来るのは設定漏れ。
    throw new Error('JWT_SECRET が設定されていません。.env を確認してください。');
  }
  return new TextEncoder().encode(secret);
}

/** セッション Cookie に載せる JWT を発行する。 */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email, nickname: payload.nickname })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getJwtSecretKey());
}

/** JWT を検証し、ペイロードを返す。無効/期限切れの場合は null。 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
      return null;
    }
    return {
      sub: payload.sub,
      email: payload.email,
      nickname: typeof payload.nickname === 'string' ? payload.nickname : '',
    };
  } catch {
    return null;
  }
}

/**
 * 現在のリクエストのセッション Cookie を読み取り、ログイン中ユーザー情報を返す。
 * Server Component・Route Handler のどちらからも呼び出せる(読み取りのみのため)。
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const id = Number(payload.sub);
  if (!Number.isInteger(id)) return null;

  return { id, email: payload.email, nickname: payload.nickname };
}

/**
 * ログイン成功時にセッション Cookie を発行する。
 * Cookie の書き込みは Route Handler(または Server Function)内でのみ許可されているため、
 * app/api/auth/signup・app/api/auth/login の Route Handler からのみ呼び出すこと。
 */
export async function setSessionCookie(user: AuthUser): Promise<void> {
  const token = await createSessionToken({
    sub: String(user.id),
    email: user.email,
    nickname: user.nickname,
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    // NODE_ENV ではなく実際の配信プロトコルで判定する(本番でも HTTPS 化前は
    // Secure Cookie をブラウザが保存できず、ログイン状態が一切保持されなくなるため)。
    secure: (process.env.NEXT_PUBLIC_APP_URL ?? '').startsWith('https://'),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** ログアウト時にセッション Cookie を削除する。 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
