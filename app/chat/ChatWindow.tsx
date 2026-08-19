'use client';

import { useId, useState } from 'react';
import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';
import { MAX_CHAT_MESSAGE_LENGTH } from '@/lib/constants/chat';
import { ja } from '@/lib/i18n/ja';
import type {
  ChatErrorResponse,
  ChatHistory,
  ChatRecommendedWork,
  ChatResponseBody,
} from '@/lib/types/chat';

const MESSAGES = ja.chat;

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  recommendedWorks?: ChatRecommendedWork[];
}

function pickDisplayTitle(work: ChatRecommendedWork): string {
  return work.titleNative ?? work.titleRomaji ?? work.titleEnglish ?? '無題';
}

function RecommendedWorkCard({ work }: { work: ChatRecommendedWork }) {
  return (
    <Link href={`/works/${work.id}`} className="block w-36 flex-none">
      <Card className="h-full overflow-hidden">
        {work.coverImageUrl ? (
          // AniList の画像を直接 hotlink する方針のため通常の img 要素を使う。
          // eslint-disable-next-line @next/next/no-img-element
          <img src={work.coverImageUrl} alt="" className="h-48 w-full object-cover" />
        ) : (
          <div className="bg-muted h-48 w-full" aria-hidden />
        )}
        <CardContent className="flex flex-col gap-1 pt-3">
          <Badge variant={work.type === 'ANIME' ? 'primary' : 'secondary'} className="self-start">
            {ja.works.detail.typeLabels[work.type]}
          </Badge>
          <p className="text-foreground line-clamp-2 text-xs font-medium">
            {pickDisplayTitle(work)}
          </p>
          {work.averageRating != null && (
            <p className="text-muted-foreground text-xs">
              {ja.ranking.common.averageRatingLabel(work.averageRating.toFixed(1))}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

// おすすめチャットボットの本体(P2-2)。
// 会話履歴は Anthropic のメッセージ配列(tool_use/tool_result を含む)そのままを
// state に保持し、次のリクエストに送り返す(このアプリはステートレスなので、
// サーバー側は会話状態を持たない)。
export function ChatWindow() {
  const inputId = useId();
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);
  const [history, setHistory] = useState<ChatHistory>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  async function handleSend() {
    const message = input.trim();
    if (!message || isSending) return;
    if (message.length > MAX_CHAT_MESSAGE_LENGTH) {
      setErrorText(MESSAGES.errors.messageTooLong);
      return;
    }

    setErrorText(null);
    setInput('');
    setDisplayMessages((prev) => [
      ...prev,
      { id: `user-${prev.length}`, role: 'user', text: message },
    ]);
    setIsSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
      });

      if (!response.ok) {
        const data: ChatErrorResponse = await response
          .json()
          .catch(() => ({ error: 'generic' as const }));
        setErrorText(MESSAGES.errors[data.error] ?? MESSAGES.errors.generic);
        return;
      }

      const data: ChatResponseBody = await response.json();
      setHistory(data.history);
      setDisplayMessages((prev) => [
        ...prev,
        {
          id: `assistant-${prev.length}`,
          role: 'assistant',
          text: data.reply,
          recommendedWorks: data.recommendedWorks,
        },
      ]);
    } catch {
      setErrorText(MESSAGES.errors.generic);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-1 flex-col gap-4">
      <div className="flex flex-1 flex-col gap-5">
        {displayMessages.length === 0 ? (
          <EmptyState
            title={MESSAGES.emptyConversation.title}
            description={MESSAGES.emptyConversation.description}
          />
        ) : (
          displayMessages.map((entry) => (
            <div
              key={entry.id}
              className={`flex flex-col gap-2 ${entry.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={
                  entry.role === 'user'
                    ? 'bg-primary text-primary-foreground max-w-md rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap'
                    : 'bg-surface text-surface-foreground border-border max-w-md rounded-2xl border px-4 py-2 text-sm whitespace-pre-wrap'
                }
              >
                {entry.text}
              </div>

              {entry.recommendedWorks && entry.recommendedWorks.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-muted-foreground text-xs">{MESSAGES.recommendedWorksTitle}</p>
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {entry.recommendedWorks.map((work) => (
                      <RecommendedWorkCard key={work.id} work={work} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        {isSending && (
          <div className="flex items-center gap-2 self-start">
            <Spinner size={16} />
          </div>
        )}
      </div>

      {errorText && <p className="text-error text-sm">{errorText}</p>}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSend();
        }}
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <label htmlFor={inputId} className="sr-only">
          {MESSAGES.inputLabel}
        </label>
        <Textarea
          id={inputId}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void handleSend();
            }
          }}
          maxLength={MAX_CHAT_MESSAGE_LENGTH}
          placeholder={MESSAGES.placeholder}
          rows={2}
          className="flex-1"
        />
        <Button type="submit" isLoading={isSending} disabled={!input.trim() || isSending}>
          {isSending ? MESSAGES.sending : MESSAGES.send}
        </Button>
      </form>
    </div>
  );
}
