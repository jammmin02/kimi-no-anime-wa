'use client';

import { type ReactNode, useState } from 'react';
import { Ghost, Search } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField, Label } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Rating } from '@/components/ui/Rating';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';

// 開発用スタイルガイドページ。新しいコンポーネントを追加するときは、既存の
// トークン/コンポーネントを再利用できていないか(独自の色やボタンを作って
// いないか)をここで一目で確認できるようにする。検索エンジンには乗せない。
// (このファイル自体は 'use client' の1ページに全部まとめているが、これは
// 開発用ページゆえの簡略化であり、実際の画面実装ではサーバー/クライアント
// コンポーネントを適切に使い分けること。)

// 注意: Tailwind はソースコードを静的解析してクラス名を抽出するため、
// `bg-${name}` のようにテンプレートリテラルで組み立てたクラス名は認識できない
// (完全な形の文字列としてソース上に存在しないと生成されない)。
// そのため、ここでは必ず完全な形のクラス名をそのまま文字列として持たせている。
const COLOR_TOKENS = [
  { swatchClass: 'bg-primary', label: 'Primary', tokenClass: 'bg-primary' },
  { swatchClass: 'bg-secondary', label: 'Secondary', tokenClass: 'bg-secondary' },
  { swatchClass: 'bg-accent', label: 'Accent', tokenClass: 'bg-accent' },
  { swatchClass: 'bg-success', label: 'Success', tokenClass: 'bg-success' },
  { swatchClass: 'bg-warning', label: 'Warning', tokenClass: 'bg-warning' },
  { swatchClass: 'bg-error', label: 'Error', tokenClass: 'bg-error' },
] as const;

const NEUTRAL_TOKENS = [
  { swatchClass: 'bg-background', label: 'Background', tokenClass: 'bg-background' },
  { swatchClass: 'bg-surface', label: 'Surface', tokenClass: 'bg-surface' },
  { swatchClass: 'bg-muted', label: 'Muted', tokenClass: 'bg-muted' },
  { swatchClass: 'bg-border', label: 'Border', tokenClass: 'bg-border' },
] as const;

const TYPE_SCALE = [
  'text-xs',
  'text-sm',
  'text-base',
  'text-lg',
  'text-xl',
  'text-2xl',
  'text-3xl',
  'text-4xl',
] as const;

const SPACING_SCALE = [
  'gap-1',
  'gap-2',
  'gap-3',
  'gap-4',
  'gap-6',
  'gap-8',
  'gap-12',
  'gap-16',
] as const;

const RADIUS_SCALE = [
  'rounded-sm',
  'rounded-md',
  'rounded-lg',
  'rounded-xl',
  'rounded-full',
] as const;

const SHADOW_SCALE = ['shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl'] as const;

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-border flex flex-col gap-4 border-b pb-10">
      <div>
        <h2 className="text-foreground text-xl font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export default function StyleGuidePage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [interactiveRating, setInteractiveRating] = useState(3);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-foreground text-3xl font-bold tracking-tight">スタイルガイド</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          P0-5 で定義したデザイントークンと共通コンポーネントの一覧。以降の画面はここにある
          ものだけを再利用し、ページ固有の色・ボタンを新しく作らないこと。
        </p>
      </header>

      <Section title="カラートークン" description="ブランドカラー・状態色(ライト/ダーク共通)">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {COLOR_TOKENS.map((token) => (
            <div key={token.tokenClass} className="flex flex-col gap-2">
              <div className={`h-16 rounded-lg ${token.swatchClass}`} />
              <p className="text-foreground text-xs font-medium">{token.label}</p>
              <p className="text-muted-foreground text-xs">{token.tokenClass}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="ニュートラルトークン"
        description="背景・サーフェス・ボーダー(ダークモードで反転する)"
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {NEUTRAL_TOKENS.map((token) => (
            <div key={token.tokenClass} className="flex flex-col gap-2">
              <div className={`border-border h-16 rounded-lg border ${token.swatchClass}`} />
              <p className="text-foreground text-xs font-medium">{token.label}</p>
              <p className="text-muted-foreground text-xs">{token.tokenClass}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="タイポグラフィスケール"
        description="日本語・韓国語混在時の可読性を確認するためのサンプル文"
      >
        <div className="flex flex-col gap-3">
          {TYPE_SCALE.map((cls) => (
            <p key={cls} className={`${cls} text-foreground`}>
              <span className="text-muted-foreground mr-2 text-xs">{cls}</span>
              君のアニメは / 너의 애니메이션은 / The quick brown fox
            </p>
          ))}
        </div>
      </Section>

      <Section title="spacing スケール" description="--spacing 基準値から算出される gap">
        <div className="flex flex-col gap-2">
          {SPACING_SCALE.map((cls) => (
            <div key={cls} className="flex items-center gap-3">
              <span className="text-muted-foreground w-14 text-xs">{cls}</span>
              <div className={`flex ${cls}`}>
                <div className="bg-primary h-4 w-4 rounded" />
                <div className="bg-primary h-4 w-4 rounded" />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="border-radius スケール">
        <div className="flex flex-wrap gap-4">
          {RADIUS_SCALE.map((cls) => (
            <div key={cls} className="flex flex-col items-center gap-2">
              <div className={`bg-primary h-16 w-16 ${cls}`} />
              <p className="text-muted-foreground text-xs">{cls}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="シャドウスケール">
        <div className="flex flex-wrap gap-6">
          {SHADOW_SCALE.map((cls) => (
            <div key={cls} className="flex flex-col items-center gap-2">
              <div className={`bg-surface h-16 w-16 rounded-lg ${cls}`} />
              <p className="text-muted-foreground text-xs">{cls}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Button">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="primary" isLoading>
            送信中
          </Button>
          <Button variant="primary" disabled>
            無効
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      <Section title="Badge">
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="primary">Primary</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="success">視聴済み</Badge>
          <Badge variant="warning">放送中</Badge>
          <Badge variant="error">配信終了</Badge>
        </div>
      </Section>

      <Section title="Card">
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>作品タイトル例</CardTitle>
            <CardDescription>ジャンル・話数などの補足情報をここに表示する。</CardDescription>
          </CardHeader>
          <CardContent>
            <Rating value={4.2} />
          </CardContent>
          <CardFooter>
            <Button size="sm" variant="outline">
              詳細を見る
            </Button>
          </CardFooter>
        </Card>
      </Section>

      <Section title="Rating">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-xs">表示専用(3.7 / 5)</span>
            <Rating value={3.7} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-xs">入力可能</span>
            <Rating value={interactiveRating} onChange={setInteractiveRating} />
            <span className="text-muted-foreground text-xs">{interactiveRating} / 5</span>
          </div>
        </div>
      </Section>

      <Section title="フォーム(Input / FormField)">
        <div className="flex max-w-sm flex-col gap-4">
          <FormField label="ニックネーム" helperText="他のユーザーに表示される名前です。" required>
            {(id) => <Input id={id} placeholder="例: あにめ好き" />}
          </FormField>
          <FormField label="メールアドレス" errorText="正しいメールアドレスを入力してください。">
            {(id) => <Input id={id} type="email" invalid defaultValue="not-an-email" />}
          </FormField>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="disabled-input">無効化された入力欄</Label>
            <Input id="disabled-input" disabled placeholder="編集不可" />
          </div>
          <FormField label="レビュー本文" helperText="複数行の入力にはこの Textarea を使う。">
            {(id) => <Textarea id={id} placeholder="感想を入力してください" />}
          </FormField>
        </div>
      </Section>

      <Section title="Dialog">
        <Button onClick={() => setIsDialogOpen(true)}>ダイアログを開く</Button>
        <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} title="確認">
          <p className="text-muted-foreground text-sm">
            この操作を実行しますか?この文言もダイアログの使用例です。
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              キャンセル
            </Button>
            <Button variant="primary" onClick={() => setIsDialogOpen(false)}>
              実行する
            </Button>
          </div>
        </Dialog>
      </Section>

      <Section title="Loading / Skeleton">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Spinner />
            <span className="text-muted-foreground text-sm">Spinner</span>
          </div>
          <div className="flex max-w-sm flex-col gap-2">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </Section>

      <Section title="Empty State">
        <div className="grid gap-4 sm:grid-cols-2">
          <EmptyState
            title="検索結果がありません"
            description="条件を変更して再度検索してください。"
            icon={Search}
            action={
              <Button variant="outline" size="sm">
                条件をリセット
              </Button>
            }
          />
          <EmptyState
            icon={Ghost}
            title="保管庫はまだ空です"
            description="気になる作品をお気に入りに追加しましょう。"
          />
        </div>
      </Section>
    </div>
  );
}
