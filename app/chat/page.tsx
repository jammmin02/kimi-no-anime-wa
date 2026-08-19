import type { Metadata } from 'next';

import { ja } from '@/lib/i18n/ja';

import { ChatWindow } from './ChatWindow';

export const metadata: Metadata = {
  title: `${ja.chat.title} | 君のアニメは`,
};

// 対話型おすすめチャットボットのページ(P2-2)。
// 会話状態はクライアント側(ChatWindow)で保持するため、この画面自体はレイアウトの外枠のみを持つ。
// ログイン必須の機能ではないため、未ログインでもそのまま利用できる。
export default function ChatPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">{ja.chat.title}</h1>
        <p className="text-muted-foreground text-sm">{ja.chat.description}</p>
      </header>
      <ChatWindow />
    </div>
  );
}
