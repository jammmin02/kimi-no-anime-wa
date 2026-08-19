'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

// モーダル/ダイアログ。追加のライブラリ(Radix 等)を入れず、ブラウザ標準の
// <dialog> 要素(showModal)を使って実装している。フォーカストラップ・ESC キーでの
// クローズ・::backdrop はブラウザが標準で面倒を見てくれる。
export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        // クリック位置が <dialog> 自身(= backdrop 部分)のときだけ閉じる。
        // 内側のコンテンツをクリックしたときは event.target がその子要素になるため無視される。
        if (event.target === dialogRef.current) {
          onClose();
        }
      }}
      className={cn(
        'border-border bg-surface text-surface-foreground w-[calc(100vw-2rem)] max-w-md rounded-xl border p-0 shadow-xl',
        'backdrop:bg-black/50',
        className,
      )}
    >
      <div className="border-border flex items-center justify-between gap-4 border-b px-5 py-4">
        {title && <h2 className="text-lg font-semibold">{title}</h2>}
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="hover:bg-muted ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg"
        >
          <X size={18} />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}
