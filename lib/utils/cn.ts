import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// clsx で条件付きクラス名を組み立てたあと、tailwind-merge で
// 競合する Tailwind ユーティリティ(例: "px-2" と "px-4")を後勝ちで解決する。
// コンポーネントの className は必ずこの関数経由でマージすること。
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
