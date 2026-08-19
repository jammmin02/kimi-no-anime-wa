import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

// ボタンの見た目パターン。ページごとに新しい配色を作らず、必ずこの variant から選ぶこと。
const BUTTON_VARIANTS = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover',
  outline: 'border border-border bg-transparent text-foreground hover:bg-muted',
  ghost: 'bg-transparent text-foreground hover:bg-muted',
  destructive: 'bg-error text-error-foreground hover:opacity-90',
} as const;

const BUTTON_SIZES = {
  sm: 'h-8 gap-1.5 rounded-md px-3 text-xs',
  md: 'h-10 gap-2 rounded-lg px-4 text-sm',
  lg: 'h-12 gap-2 rounded-lg px-6 text-base',
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;
export type ButtonSize = keyof typeof BUTTON_SIZES;

export interface ButtonVariantsOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

// <button> 以外の要素(next/link の <Link> など)にボタンの見た目だけを適用したいときに使う。
// 例: <Link href="/works" className={buttonVariants({ variant: 'outline' })}>一覧へ</Link>
export function buttonVariants({
  variant = 'primary',
  size = 'md',
  className,
}: ButtonVariantsOptions = {}) {
  return cn(
    'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-colors',
    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
    'disabled:pointer-events-none disabled:opacity-50',
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** true の間はスピナーを表示し、クリックを無効化する(送信中などに使用)。 */
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', isLoading = false, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={buttonVariants({ variant, size, className })}
      {...props}
    >
      {isLoading && <Loader2 className="animate-spin" size={16} aria-hidden />}
      {children}
    </button>
  );
});
