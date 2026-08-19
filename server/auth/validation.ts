// 会員登録/ログインフォームの入力値バリデーション。
// エラーは翻訳済み文言ではなく「コード」で返し、実際の文言は lib/i18n/ja.ts 側で解決する
// (サーバー側を言語非依存に保つため)。

import {
  EMAIL_PATTERN,
  MAX_NICKNAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from '@/lib/constants/auth';
import type { SignupFieldErrors } from '@/lib/types/auth';

export interface SignupInput {
  email: unknown;
  password: unknown;
  nickname: unknown;
}

export interface ValidatedSignupInput {
  email: string;
  password: string;
  nickname: string;
}

/**
 * 会員登録の入力値を検証する。
 * 戻り値の `fieldErrors` が空オブジェクトなら valid。
 */
export function validateSignupInput(input: SignupInput): {
  fieldErrors: SignupFieldErrors;
  value: ValidatedSignupInput | null;
} {
  const fieldErrors: SignupFieldErrors = {};

  const email = typeof input.email === 'string' ? input.email.trim() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const nickname = typeof input.nickname === 'string' ? input.nickname.trim() : '';

  if (!EMAIL_PATTERN.test(email)) {
    fieldErrors.email = 'emailInvalid';
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    fieldErrors.password = 'passwordTooShort';
  } else if (password.length > MAX_PASSWORD_LENGTH) {
    fieldErrors.password = 'passwordTooLong';
  }

  if (nickname.length === 0) {
    fieldErrors.nickname = 'nicknameRequired';
  } else if (nickname.length > MAX_NICKNAME_LENGTH) {
    fieldErrors.nickname = 'nicknameTooLong';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, value: null };
  }

  return { fieldErrors, value: { email, password, nickname } };
}

export interface LoginInput {
  email: unknown;
  password: unknown;
}

export interface ValidatedLoginInput {
  email: string;
  password: string;
}

/**
 * ログインの入力値を検証する。
 * ログイン時は「メール形式が不正」等の詳細を返さず、後段の認証失敗と同じ
 * 'invalidCredentials' に丸めることで、登録済みメールアドレスの存在を推測されにくくする。
 */
export function validateLoginInput(input: LoginInput): ValidatedLoginInput | null {
  const email = typeof input.email === 'string' ? input.email.trim() : '';
  const password = typeof input.password === 'string' ? input.password : '';

  if (!EMAIL_PATTERN.test(email) || password.length === 0) {
    return null;
  }

  return { email, password };
}
