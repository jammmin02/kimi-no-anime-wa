import { type ReactNode } from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** 「検索条件を変更する」ボタンなど、次の行動を促す要素。 */
  action?: ReactNode;
  className?: string;
}

// 検索結果 0 件・保管庫が空、などの「表示するデータが無い」状態を示す共通コンポーネント。
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'border-border flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center',
        className,
      )}
    >
      <Icon className="text-muted-foreground" size={40} aria-hidden />
      <p className="text-foreground text-base font-semibold">{title}</p>
      {description && <p className="text-muted-foreground max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
