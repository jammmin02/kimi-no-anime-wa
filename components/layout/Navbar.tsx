'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

import { buttonVariants } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LogoutButton } from '@/components/layout/LogoutButton';
import { ja } from '@/lib/i18n/ja';
import { cn } from '@/lib/utils/cn';
import type { AuthUser } from '@/lib/types/auth';

// ナビゲーションリンク。
const NAV_ITEMS = [
  { label: '作品一覧', href: '/works' },
  { label: 'ランキング', href: '/ranking' },
  { label: '自然言語検索', href: '/search' },
  { label: 'おすすめチャット', href: '/chat' },
  // 保管庫はユーザーごとのデータのため /mypage 配下の画面(P1-8)にしている。
  // 未ログインでアクセスした場合は /mypage 自体のリダイレクト( /login へ)に任せる。
  { label: '保管庫', href: '/mypage/library' },
] as const;

export interface NavbarProps {
  /** RootLayout(サーバーコンポーネント)がセッション Cookie から解決したログイン中ユーザー。未ログインなら null。 */
  user: AuthUser | null;
}

// 全画面共通の上部ナビゲーションバー。
// モバイルではハンバーガーメニューに折りたたみ、デスクトップでは横並びで表示する
// レスポンシブ対応(モバイルファースト。md 以上で展開レイアウトに切り替える)。
export function Navbar({ user }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="border-border bg-background/80 sticky top-0 z-40 border-b backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-foreground text-lg font-bold tracking-tight">
          君のアニメは
        </Link>

        {/* デスクトップ用ナビゲーション(md 以上でのみ表示) */}
        <nav className="hidden items-center gap-6 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Link href="/mypage" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                {ja.auth.navbar.mypageLink}
              </Link>
              <LogoutButton size="sm" />
            </>
          ) : (
            <>
              <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                {ja.auth.navbar.loginLink}
              </Link>
              <Link href="/signup" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
                {ja.auth.navbar.signupLink}
              </Link>
            </>
          )}
          <ThemeToggle />
        </div>

        {/* モバイル用トグルボタン(md 未満でのみ表示) */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          aria-label={isMobileMenuOpen ? 'メニューを閉じる' : 'メニューを開く'}
          aria-expanded={isMobileMenuOpen}
          className="text-foreground hover:bg-muted inline-flex h-9 w-9 items-center justify-center rounded-lg md:hidden"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* モバイル用ドロップダウンメニュー。
          閉じている間は max-h-0 で見た目上は隠すが、それだけだとリンクが
          キーボードフォーカス可能なまま残ってしまうため、inert 属性で
          フォーカス/スクリーンリーダーからも完全に除外する。 */}
      <div
        inert={!isMobileMenuOpen}
        className={cn(
          'border-border overflow-hidden border-b transition-[max-height] duration-200 ease-in-out md:hidden',
          isMobileMenuOpen ? 'max-h-64' : 'max-h-0 border-b-0',
        )}
      >
        <nav className="flex flex-col gap-1 px-4 py-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg px-2 py-2 text-sm font-medium"
            >
              {item.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link
                href="/mypage"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg px-2 py-2 text-sm font-medium"
              >
                {ja.auth.navbar.mypageLink}
              </Link>
              <div className="px-2 py-2">
                <LogoutButton size="sm" className="w-full" />
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg px-2 py-2 text-sm font-medium"
              >
                {ja.auth.navbar.loginLink}
              </Link>
              <Link
                href="/signup"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg px-2 py-2 text-sm font-medium"
              >
                {ja.auth.navbar.signupLink}
              </Link>
            </>
          )}
          <div className="flex items-center justify-between px-2 py-2">
            <span className="text-muted-foreground text-sm font-medium">表示モード</span>
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
