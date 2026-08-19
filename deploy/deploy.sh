#!/usr/bin/env bash
# ============================================================================
# EC2 上で実行する本番デプロイスクリプト(コードを更新するたびに実行する)。
#
# 前提:
#   - deploy/setup-ec2.sh によって Docker / Docker Compose plugin が導入済み
#   - このリポジトリが $APP_DIR に git clone 済みで、.env.production が
#     配置・設定済み(.env.production.example を参照)
#
# 実行方法(EC2 上、または GitHub Actions からの SSH 経由):
#   APP_DIR=/opt/kimi-no-anime-wa bash deploy/deploy.sh
#
# 処理内容:
#   1. 最新コードを取得する(git pull)
#   2. Docker イメージをビルドする
#   3. (ローカル DB を使う場合)db コンテナを起動する
#   4. `prisma migrate deploy` を実行する(migrate profile の使い捨てコンテナ)
#   5. app / libretranslate を起動(再作成)する
#   6. 使われなくなった古いイメージを削除する
# ============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE="${ENV_FILE:-.env.production}"
# ローカル DB(このホスト上の Postgres コンテナ)を使う場合は true のまま、
# RDS 等に移行した場合は false にして db サービスを起動対象から外す。
USE_LOCAL_DB="${USE_LOCAL_DB:-true}"

cd "$APP_DIR"

# `.env.production` は Compose の既定の変数展開ソース(`.env`)ではないため、
# ports の `${APP_PORT:-80}` 等を正しく展開させるには毎回 --env-file を明示する。
COMPOSE=(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE")

echo "[deploy] 最新コードを取得しています..."
git pull --ff-only

echo "[deploy] Docker イメージをビルドしています..."
"${COMPOSE[@]}" build

if [ "$USE_LOCAL_DB" = "true" ]; then
  echo "[deploy] ローカル DB(Postgres コンテナ)を起動しています..."
  "${COMPOSE[@]}" --profile local-db up -d db
fi

echo "[deploy] マイグレーションを実行しています..."
"${COMPOSE[@]}" --profile tools run --rm migrate

echo "[deploy] アプリを起動しています..."
"${COMPOSE[@]}" up -d app libretranslate

echo "[deploy] 使われなくなった古いイメージを削除しています..."
docker image prune -f

echo "[deploy] デプロイが完了しました。"
