# server/

サーバーサイドでのみ実行される処理をまとめるディレクトリです。
クライアントコンポーネントから直接 import しないこと。

- `db/` : データベース接続クライアント。`client.ts` で Prisma Client のシングルトン
  インスタンスを生成してエクスポートする(`@prisma/adapter-pg` による driver adapter
  経由の接続)。`generated/` は `npm run db:generate` で生成される Prisma Client の
  出力先で、Git 管理対象外(.gitignore 参照)。スキーマ本体は `prisma/schema.prisma`、
  マイグレーションは `prisma/migrations/` にある(P0-2 で作成)。
- `services/` : 外部 API 連携ロジック(AniList GraphQL API、Anthropic Claude API、
  LibreTranslate など)。レート制限対応やリトライ処理もここに実装する。
- `auth/` : メールアドレス+パスワード方式の自前認証ロジック(パスワードの
  ハッシュ化・JWT/セッション発行など)。ソーシャルログインは実装しない。

`app/api/**` の Route Handler からは、なるべくこの `server/` 配下の関数を
呼び出す薄い層として実装し、ビジネスロジック自体は `server/` に集約する。
