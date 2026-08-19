'use client';

import { useState } from 'react';
import Link from 'next/link';

import { ja } from '@/lib/i18n/ja';
import type { LibraryErrorResponse } from '@/lib/types/library';
import type { LibraryStatus, WorkType } from '@/server/db/generated/prisma/enums';

const MESSAGES = ja.works.library;
const STATUSES: LibraryStatus[] = ['PLANNING', 'WATCHING', 'COMPLETED', 'ON_HOLD', 'DROPPED'];

/** select の value は文字列のみのため、「未登録」を表す番兵値として使う。 */
const NOT_IN_LIBRARY_VALUE = 'NONE';

export interface LibraryStatusControlProps {
  workId: number;
  workType: WorkType;
  isLoggedIn: boolean;
  initialStatus: LibraryStatus | null;
}

// 作品詳細ページの保管庫ステータス変更ドロップダウン(P1-8)。
// 「未登録」を選ぶと DELETE、それ以外を選ぶと PUT(upsert)で
// LibraryEntry を更新する — 1 つのセレクトで追加/変更/削除をまとめて扱う。
export function LibraryStatusControl({
  workId,
  workType,
  isLoggedIn,
  initialStatus,
}: LibraryStatusControlProps) {
  const [status, setStatus] = useState<LibraryStatus | null>(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isLoggedIn) {
    return (
      <p className="text-muted-foreground text-sm">
        {MESSAGES.loginPrompt}{' '}
        <Link href="/login" className="text-primary underline">
          {ja.auth.navbar.loginLink}
        </Link>
      </p>
    );
  }

  async function handleChange(nextValue: string) {
    setError(null);
    setIsSaving(true);

    const previousStatus = status;
    const nextStatus = nextValue === NOT_IN_LIBRARY_VALUE ? null : (nextValue as LibraryStatus);
    setStatus(nextStatus);

    try {
      const response = await fetch(`/api/works/${workId}/library`, {
        method: nextStatus ? 'PUT' : 'DELETE',
        headers: nextStatus ? { 'Content-Type': 'application/json' } : undefined,
        body: nextStatus ? JSON.stringify({ status: nextStatus }) : undefined,
      });

      if (!response.ok) {
        const data: LibraryErrorResponse = await response
          .json()
          .catch(() => ({ error: 'generic' }));
        setError(MESSAGES.errors[data.error] ?? MESSAGES.errors.generic);
        setStatus(previousStatus);
      }
    } catch {
      setError(MESSAGES.errors.generic);
      setStatus(previousStatus);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-muted-foreground text-xs font-semibold" htmlFor="library-status">
        {MESSAGES.label}
      </label>
      <select
        id="library-status"
        value={status ?? NOT_IN_LIBRARY_VALUE}
        onChange={(event) => handleChange(event.target.value)}
        disabled={isSaving}
        className="border-border bg-background text-foreground h-9 w-fit rounded-lg border px-3 text-sm disabled:opacity-50"
      >
        <option value={NOT_IN_LIBRARY_VALUE}>{MESSAGES.notInLibrary}</option>
        {STATUSES.map((option) => (
          <option key={option} value={option}>
            {MESSAGES.statusLabels[option][workType]}
          </option>
        ))}
      </select>
      {error && <p className="text-error text-xs">{error}</p>}
    </div>
  );
}
