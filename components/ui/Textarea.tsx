import { forwardRef, type TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/utils/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** true の場合、エラー状態の枠線色にする(実際のエラー文言は FormField 側で表示する)。 */
  invalid?: boolean;
}

// レビュー本文・コメントなど、複数行の入力に使う共通テキストエリア。
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid = false, rows = 4, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        'bg-background text-foreground w-full resize-y rounded-lg border px-3 py-2 text-sm',
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
