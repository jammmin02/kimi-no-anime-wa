import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/server/auth/session';
import { ja } from '@/lib/i18n/ja';

import { SignupForm } from './SignupForm';

export const metadata: Metadata = {
  title: `${ja.auth.signup.title} | 君のアニメは`,
};

// すでにログイン中のユーザーが /signup に来た場合は、二重登録を防ぐためマイページへ流す。
export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect('/mypage');
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <SignupForm />
      </div>
    </div>
  );
}
