# ============================================================================
# 「君のアニメは」本番用 Dockerfile。
#
# EC2(t3.micro / t4g.micro, 1GB RAM 前提)で動かすことを想定し、
# Next.js の `output: 'standalone'` を使って実行時イメージを最小限に絞る
# マルチステージビルド構成にしている。
#
# ステージ構成:
#   deps    : 依存関係のインストール(devDependencies含む。builder/batch で共用)
#   builder : Prisma Client 生成 + Next.js のプロダクションビルド
#   runner  : アプリ本体(Next.js standalone サーバー)実行用の最小イメージ
#   batch   : `prisma migrate deploy` / AniList 同期 / ランキングスナップショット保存
#             スクリプトなど、devDependencies(tsx 等)が必要な CLI 実行専用イメージ
#             (standalone化はせず、builder の中身をそのまま使う)
# ============================================================================

FROM node:22-alpine AS deps
WORKDIR /app
# Prisma の生成物(prisma-client)が内部で使う native 依存の都合上、
# alpine(musl libc)でも openssl を入れておく(安全策)。
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# prisma.config.ts が DATABASE_URL の解決を要求するため(実際に接続はしない)、
# `prisma generate` の実行にはダミー値で十分。実際の接続文字列は実行時に
# docker-compose の env_file(.env.production)から渡される。
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"
# schema.prisma から Prisma Client(server/db/generated/prisma)を生成する。
# .gitignore 対象のため、ビルドのたびにここで必ず生成し直す。
RUN npx prisma generate
# next.config.ts の `output: 'standalone'` により .next/standalone が作られる。
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl \
  && addgroup -S nodejs \
  && adduser -S nextjs -G nodejs
COPY --from=builder /app/public ./public
# standalone 出力には実行に必要な node_modules(トレース済み)と server.js が含まれる。
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["node", "server.js"]

# batch: マイグレーション/AniList 同期用。tsx・prisma CLI など devDependencies が
# 必要なため standalone 化せず、builder の内容(全 node_modules + ソース一式 +
# 生成済み Prisma Client)をそのまま流用する。実行するコマンドは
# docker-compose.prod.yml 側の `command:` で指定する(migrate / sync:anilist /
# snapshot:ranking など)。
FROM builder AS batch
WORKDIR /app
CMD ["npm", "run", "db:deploy"]
