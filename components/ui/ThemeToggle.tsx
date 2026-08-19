'use client';

import { Moon, Sun } from 'lucide-react';

import { THEME_STORAGE_KEY, type Theme } from '@/lib/constants/theme';
import { cn } from '@/lib/utils/cn';

// ライト/ダークモードの切り替えボタン。
// 「ライトモード優先 + ダークモードは選択式サポート」という方針のため、OS の
// prefers-color-scheme には追従せず、ユーザーがこのボタンで明示的に切り替えた
// 状態だけを localStorage に保存する(初期化ロジックは app/layout.tsx を参照)。
//
// 現在のテーマを React の state では持たない。理由:
// - サーバー側は常に "light" しか分からず、クライアントの実際の状態(localStorage)
//   と食い違うため、マウント後に setState で同期するとハイドレーション後の
//   ちらつきや、不要な再レンダリングを招く。
// - 代わりに Sun/Moon 両方を DOM に描画しておき、Tailwind の `dark:` バリアントで
//   どちらを表示するかを CSS だけで切り替える。<html> への "dark" クラス付与は
//   app/layout.tsx の初期化スクリプトがハイドレーション前に済ませているため、
//   最初の描画から正しいアイコンが出る。
export function ThemeToggle({ className }: { className?: string }) {
  function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    const next: Theme = isDark ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', next === 'dark');
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="ライト/ダークモードを切り替える"
      className={cn(
        'border-border text-foreground hover:bg-muted inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors',
        className,
      )}
    >
      <Moon size={18} className="dark:hidden" />
      <Sun size={18} className="hidden dark:block" />
    </button>
  );
}
