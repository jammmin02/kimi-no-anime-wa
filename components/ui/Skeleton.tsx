import { type HTMLAttributes } from 'react';

import { cn } from '@/lib/utils/cn';

// データ取得中のプレースホルダー(スケルトンスクリーン)。
// 幅・高さ・角丸は className で指定する(例: className="h-4 w-32 rounded-md")。
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('bg-muted animate-pulse rounded-md', className)} aria-hidden {...props} />
  );
}
