# 君のアニメは

日本・韓国のアニメ／マンガ情報を1か所に集めて比較し、ユーザーの好みとレビューデータをもとに
AI がおすすめ作品を提案する個人・検証用プロジェクトです。原作(マンガ／ウェブトゥーン／
ライトノベル)とアニメを紐づけて「視聴順・続きの読み方」を案内し、星評価付きレビューを
AI が評価帯ごとに要約します。優先市場は日本語ユーザーですが、韓国語表示にも対応します。

作品メタデータ(タイトル・ジャンル・放送情報・原作とアニメの関係・カバー画像など)は
[AniList API](https://anilist.co) から取得して自前 DB に定期的にキャッシュし、
**ランキング・レビュー・おすすめは全て自サービス独自のユーザーデータのみを基準に**算出します
(AniList 側の人気度・平均評価はランキングの並び替えには使用せず、参考情報としてのみ表示します)。

> 本プロジェクトは非商用の個人／検証プロジェクトです。

## 技術スタック

- フロントエンド + バックエンド: Next.js (TypeScript, App Router)
- スタイリング: Tailwind CSS v4(デザイントークンは `app/theme.css` に一元化。P0-5)
- フォント: next/font(Noto Sans JP を優先読み込み、Noto Sans KR を併用)
- アイコン: lucide-react(このライブラリのみを使用する)
- DB: PostgreSQL(ローカルは Docker Compose、将来的に Amazon RDS へ移行可)
- 認証: メールアドレス + パスワードによる自前認証(ソーシャルログインは実装しない)
- 翻訳: LibreTranslate(無料・オープンソース)
- AI: Anthropic Claude API(自然言語検索・チャットボット・レビュー要約・おすすめ理由生成)
- 外部データソース: AniList GraphQL API(`https://graphql.anilist.co`)
- インフラ(想定): AWS EC2 + Docker Compose

## ディレクトリ構成

```
app/          Next.js App Router のルート(ページ・レイアウト・Route Handler)
components/   再利用可能な UI コンポーネント(ui/ 共通部品、layout/ ヘッダーフッターなど)
lib/          フレームワークに依存しない汎用ロジック(utils/ constants/ types/)
server/       サーバー専用ロジック(db/ 外部 API 連携 services/ 認証 auth/)
prisma/       DB スキーマ定義(schema.prisma)とマイグレーション履歴(migrations/)
public/       静的アセット
```

各ディレクトリの役割の詳細は、それぞれの中にある `README.md` を参照してください。

## データベーススキーマ

`prisma/schema.prisma` に以下のモデルを定義しています(詳細な設計意図はスキーマ内の
コメントを参照)。

- `Work` : AniList から同期する作品マスター(多言語タイトル、ジャンル、タグ、
  原産国、シーズン、話数/巻数、カバー画像など)。`popularity`/`averageScore`/`trending`
  は参考情報としてのみ保持し、ランキングの並び替えには使用しません。
- `WorkTag` : 作品ごとの AniList タグと連関度(%)。
- `WorkRelation` : 原作-アニメ-続編-外伝などの接続関係(AniList の relations 由来)。
- `User` : メールアドレス+パスワード方式の自前認証ユーザー(パスワードは bcrypt ハッシュ)。
- `Review` : 作品ごとのレビュー・星評価(1 ユーザー・1 作品につき 1 件、ネタバレフラグ付き)。
- `LibraryEntry` : ユーザーごとの保管庫(お気に入り/視聴中/完了などの状態)。

まだ API ルートや画面は実装しておらず、このフェーズ(P0-2)はスキーマとマイグレーションの
用意までです。

## ローカル開発環境のセットアップ

### 前提条件

- Node.js 20 以上
- npm
- Docker / Docker Compose(PostgreSQL コンテナ起動用)

### 手順

1. 依存パッケージをインストールする

   ```bash
   npm install
   ```

2. 環境変数ファイルを作成する

   ```bash
   cp .env.example .env
   ```

   `.env` の各値(DB接続情報、`ANTHROPIC_API_KEY`、`JWT_SECRET` など)を自分の環境に合わせて
   設定してください。値は実際のシークレットになるため、絶対に Git にコミットしないでください。

3. PostgreSQL コンテナを起動する

   ```bash
   docker compose up -d
   ```

4. データベースにテーブルを作成する(Prisma Migrate)

   ```bash
   npm run db:migrate
   ```

   `prisma/schema.prisma` と `prisma/migrations/` に定義済みのテーブル(作品マスター、
   ユーザー、レビュー、保管庫など)が DB に反映され、あわせて Prisma Client
   (`server/db/generated/prisma`)も生成されます。**この Prisma Client の生成が
   完了するまで `npm run dev` / `npm run build` は型エラーで失敗するため、必ずこの
   手順を先に実行してください。** 初回実行時に Prisma のエンジンバイナリが
   ダウンロードされるため、インターネット接続が必要です。

5. 開発サーバーを起動する

   ```bash
   npm run dev
   ```

   ブラウザで [http://localhost:3000](http://localhost:3000) を開いて確認します。

### その他のコマンド

| コマンド               | 説明                                           |
| ---------------------- | ---------------------------------------------- |
| `npm run build`        | 本番用ビルド                                   |
| `npm run start`        | ビルド済みアプリの起動                         |
| `npm run lint`         | ESLint によるコード検査                        |
| `npm run lint:fix`     | ESLint の自動修正                              |
| `npm run format`       | Prettier によるコード整形(書き込みあり)        |
| `npm run format:check` | Prettier のフォーマットチェック(書き込みなし)  |
| `npm run db:migrate`   | Prisma Migrate でスキーマ変更を DB に反映      |
| `npm run db:deploy`    | 本番向けにマイグレーションを適用(新規作成なし) |
| `npm run db:generate`  | Prisma Client の再生成                         |
| `npm run db:studio`    | Prisma Studio(DB の中身を GUI で確認)を起動    |
| `npm run sync:anilist` | AniList バッチ同期(作品マスターの更新。P0-3)   |

## デプロイ(本番環境)

AWS EC2(t3.micro / t4g.micro, 無料利用枠)上に Docker Compose で Next.js + PostgreSQL +
LibreTranslate をまとめてデプロイする構成を用意しています。

- `Dockerfile` : Next.js standalone 実行イメージ + マイグレーション/AniList 同期用イメージの
  マルチステージビルド
- `docker-compose.prod.yml` : 本番用サービス定義(DB は将来 RDS へ移行しやすいよう
  `DATABASE_URL` のみで接続先を切り替えられる構成)
- `.env.production.example` : 本番環境変数の一覧(実際の値は含まない)
- `deploy/` : EC2 初期セットアップ・デプロイスクリプト・AniList 同期用 cron 設定・
  (任意の)GitHub Actions ワークフロー

手順の詳細(韓国語)は [`deploy/README.md`](deploy/README.md) を参照してください。

## デザインシステム(P0-5)

Phase 1 以降の全画面はここで定めたトークン・コンポーネントをそのまま再利用します。
新しい色・ボタンスタイルをページごとに作らないでください。

- **デザイントークン**: `app/theme.css` に一元定義(色・タイポグラフィ・spacing・
  角丸・シャドウ・ブレイクポイント)。Tailwind v4 の `@theme` ディレクティブで
  `bg-primary` / `text-muted-foreground` / `rounded-lg` 等のユーティリティクラスとして
  自動生成される。
- **ダーク/ライトモード**: ライトモード優先 + ダークモードは選択式(OS 設定には自動
  追従しない)。`<html>` の `.dark` クラスで切り替え、`components/ui/ThemeToggle.tsx` が
  トグル UI、`app/layout.tsx` の初期化スクリプトが FOUC 防止を担当する。
- **共通コンポーネント**(`components/ui/`): Button, Card, Badge, Input/FormField,
  Dialog(ブラウザ標準の `<dialog>` を使用), Rating(星評価), Skeleton, Spinner,
  EmptyState。すべてトークンのみを参照する。
- **アイコン**: lucide-react のみを使用し、他のアイコンセットと混在させない。
- **スタイルガイド**: [`/style-guide`](http://localhost:3000/style-guide)(開発サーバー
  起動後にアクセス)で全トークン・全コンポーネントの一覧を確認できる
  (検索エンジンには非公開)。新しいコンポーネントを追加したら、ここにも使用例を足す。

詳細な運用ルールは [`components/README.md`](components/README.md) を参照してください。

## コーディング規約

- ソースコード内のコメントはすべて日本語で記述します。変数名・関数名は英語(camelCase 等の
  一般的な命名規則)、UI 上に表示する文言は i18n リソースとして分離しますが、コード上の
  コメント自体は必ず日本語で書きます。
- スタイリングは Tailwind CSS を基本とし、ボタン・カード・入力欄などの汎用 UI は
  `components/ui/` に共通コンポーネントとして切り出して再利用します。ページごとに
  独自の色・余白の値をハードコーディングしないようにします(詳細は上記
  「デザインシステム」を参照)。
- アイコンは 1 種類のライブラリ(lucide-react)のみを使用します。

## 現在の状況

初期スキャフォールディングと DB スキーマ(Prisma)の定義、AniList バッチ同期スクリプト、
AWS EC2 へのデプロイ構成(P0-4)、フロントエンドデザインシステム(P0-5)までが完了して
います。認証機能・各種画面などは今後のフェーズで順次実装していきます。
