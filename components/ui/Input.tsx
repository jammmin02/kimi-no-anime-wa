import { type InputHTMLAttributes, forwardRef } from 'react';

import { cn } from '@/lib/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** true の場合、エラー状態の枠線色にする(実際のエラー文言は FormField 側で表示する)。 */
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid = false, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'bg-background text-foreground h-10 w-full rounded-lg border px-3 text-sm',
        'placeholder:text-muted-foreground',
        'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        invalid ? 'border-error' : 'border-border',
        className,
      )}
      aria-invalid={invalid}
      {...props}
    />
  );
});
