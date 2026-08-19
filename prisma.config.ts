// Prisma 7 用の設定ファイル。
// Prisma 7 からは接続文字列(datasource url)をスキーマファイルではなく、
// この `prisma.config.ts` で管理する方式に変更されたため、`prisma migrate` /
// `prisma studio` などの CLI コマンド実行時にはこのファイルが読み込まれる。
// (参考: https://pris.ly/d/config-datasource)
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
