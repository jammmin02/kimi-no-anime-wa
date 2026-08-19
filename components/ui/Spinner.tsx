import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

// 短時間の読み込み中を示すインラインスピナー(ボタン内部など)。
// 一覧・カード全体のローディングには Skeleton を使い、これは補助的に使う。
export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <Loader2
      size={size}
      className={cn('text-muted-foreground animate-spin', className)}
      aria-label="読み込み中"
      role="status"
    />
  );
}
