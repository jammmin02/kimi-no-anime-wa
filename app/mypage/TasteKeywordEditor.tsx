'use client';

import { type KeyboardEvent, useState } from 'react';
import { X } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { MAX_TASTE_KEYWORD_COUNT, MAX_TASTE_KEYWORD_LENGTH } from '@/lib/constants/auth';
import { ja } from '@/lib/i18n/ja';
import type { TasteKeywordErrorResponse } from '@/lib/types/auth';

const MESSAGES = ja.mypage.tasteKeywords;

export interface TasteKeywordEditorProps {
  /** マイページ(サーバーコンポーネント)から渡される、DB 保存済みの初期値。 */
  initialKeywords: string[];
}

// 好みキーワードの追加・削除・保存を行うチップ入力。P1-6 のコンテンツベース推薦で
// AniList の WorkTag(タグ名)と突き合わせる想定のため、現段階では自由入力のまま
// 文字列配列として保存するだけにとどめる(マッチングロジック自体は未実装)。
export function TasteKeywordEditor({ initialKeywords }: TasteKeywordEditorProps) {
  const [keywords, setKeywords] = useState<string[]>(initialKeywords);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  function addKeyword() {
    const keyword = inputValue.trim();
    setSaveMessage(null);

    if (!keyword) {
      setError(MESSAGES.errors.empty);
      return;
    }
    if (keyword.length > MAX_TASTE_KEYWORD_LENGTH) {
      setError(MESSAGES.errors.tooLong);
      return;
    }
    if (keywords.some((existing) => existing.toLowerCase() === keyword.toLowerCase())) {
      setError(MESSAGES.errors.duplicate);
      return;
    }
    if (keywords.length >= MAX_TASTE_KEYWORD_COUNT) {
      setError(MESSAGES.errors.tooMany);
      return;
    }

    setKeywords((current) => [...current, keyword]);
    setInputValue('');
    setError(null);
  }

  function removeKeyword(keyword: string) {
    setKeywords((current) => current.filter((item) => item !== keyword));
    setSaveMessage(null);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      addKeyword();
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/user/taste-keywords', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasteKeywords: keywords }),
      });

      if (!response.ok) {
        const data: TasteKeywordErrorResponse = await response
          .json()
          .catch(() => ({ error: 'generic' }));
        setError(MESSAGES.errors[data.error] ?? MESSAGES.errors.generic);
        return;
      }

      setSaveMessage(MESSAGES.saveSuccess);
    } catch {
      setError(MESSAGES.errors.generic);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{MESSAGES.title}</CardTitle>
        <CardDescription>{MESSAGES.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={MESSAGES.inputPlaceholder}
            invalid={Boolean(error)}
          />
          <Button type="button" variant="outline" onClick={addKeyword}>
            {MESSAGES.addButton}
          </Button>
        </div>

        {error && <p className="text-error text-xs">{error}</p>}

        {keywords.length === 0 ? (
          <p className="text-muted-foreground text-sm">{MESSAGES.empty}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword) => (
              <Badge key={keyword} variant="secondary" className="gap-1.5 py-1 pr-1.5">
                {keyword}
                <button
                  type="button"
                  onClick={() => removeKeyword(keyword)}
                  aria-label={MESSAGES.removeLabel(keyword)}
                  className="hover:bg-secondary-hover inline-flex h-4 w-4 items-center justify-center rounded-full"
                >
                  <X size={12} />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button type="button" onClick={handleSave} isLoading={isSaving}>
            {isSaving ? MESSAGES.saving : MESSAGES.saveButton}
          </Button>
          {saveMessage && <p className="text-success text-sm">{saveMessage}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
