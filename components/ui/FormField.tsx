import { type LabelHTMLAttributes, type ReactNode, useId } from 'react';

import { cn } from '@/lib/utils/cn';

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('text-foreground text-sm font-medium', className)} {...props} />;
}

export interface FormFieldProps {
  label: string;
  /** Input/Textarea など、id を割り当てたいフォーム要素を受け取る render prop。 */
  children: (fieldId: string) => ReactNode;
  /** 入力の補足説明(通常時に表示)。 */
  helperText?: string;
  /** バリデーションエラー文言。指定すると helperText の代わりに赤字で表示する。 */
  errorText?: string;
  required?: boolean;
  className?: string;
}

// ラベル・入力・ヘルパー/エラー文言をまとめて表示するフォームフィールドの共通レイアウト。
// 個々のページでラベルとエラー表示のマークアップを都度組み立てず、必ずこれを使う。
export function FormField({
  label,
  children,
  helperText,
  errorText,
  required = false,
  className,
}: FormFieldProps) {
  const fieldId = useId();
  const messageId = `${fieldId}-message`;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={fieldId}>
        {label}
        {required && (
          <span className="text-error ml-0.5" aria-hidden>
            *
          </span>
        )}
      </Label>
      {children(fieldId)}
      {(errorText || helperText) && (
        <p
          id={messageId}
          className={cn('text-xs', errorText ? 'text-error' : 'text-muted-foreground')}
        >
          {errorText ?? helperText}
        </p>
      )}
    </div>
  );
}
