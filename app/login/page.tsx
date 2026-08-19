import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/server/auth/session';
import { ja } from '@/lib/i18n/ja';

import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: `${ja.auth.login.title} | 君のアニメは`,
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect('/mypage');
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
