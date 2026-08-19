import { type HTMLAttributes } from 'react';

import { cn } from '@/lib/utils/cn';

// ジャンル/タグ・ステータス表示に使う小さなラベル。色は必ずこの variant から選ぶ。
const BADGE_VARIANTS = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  error: 'bg-error-bg text-error',
} as const;

export type BadgeVariant = keyof typeof BADGE_VARIANTS;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        BADGE_VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
