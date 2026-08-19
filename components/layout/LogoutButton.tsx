'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { buttonVariants, type ButtonVariantsOptions } from '@/components/ui/Button';
import { ja } from '@/lib/i18n/ja';
import { cn } from '@/lib/utils/cn';

// ログアウトボタン。Navbar とマイページの両方から再利用するため components/layout/ に置く。
// クリックで /api/auth/logout を呼んでセッション Cookie を削除したあと、トップページへ
// 遷移し、そのうえで router.refresh() を呼ぶ。サーバーコンポーネント(Navbar に
// ログイン状態を渡している RootLayout)はソフトナビゲーションだけでは再実行されない
// ことがあるため、refresh を push の後に呼んで確実にヘッダーの表示を更新する
// (先に refresh すると、直後の push でその再取得が打ち切られてしまうことがある)。
export function LogoutButton({ variant = 'ghost', size = 'md', className }: ButtonVariantsOptions) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={cn(buttonVariants({ variant, size }), className)}
    >
      {ja.auth.logout.button}
    </button>
  );
}
