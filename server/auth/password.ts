// パスワードのハッシュ化・検証。
// bcrypt アルゴリズムを純粋な JS で実装した bcryptjs を使う(ネイティブビルドが
// 不要なため、Docker/Windows など環境を問わず同じように動く)。

import bcrypt from 'bcryptjs';

/** ソルトのコストファクター(2^10 = 1024 回のストレッチング)。 */
const SALT_ROUNDS = 10;

/**
 * 実在しないユーザーでログインを試みられたときに、bcrypt.compare を実行する時間を
 * 実在ユーザーの場合と揃えるためのダミーハッシュ(タイミング攻撃対策)。
 * 中身に意味はなく、単に有効な bcrypt ハッシュ形式であればよい。
 */
export const DUMMY_PASSWORD_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8u1lXi1Q6y2nUmYqzE.9pXhF4BSJ0K';

/** 平文パスワードを bcrypt でハッシュ化する。DB には必ずこの戻り値のみを保存する。 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/** 平文パスワードが保存済みハッシュと一致するか検証する。 */
export async function verifyPassword(
  plainPassword: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}
