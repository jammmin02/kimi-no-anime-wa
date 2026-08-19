#!/usr/bin/env bash
# ============================================================================
# cron から呼び出す AniList バッチ同期のラッパースクリプト。
#
# 実行方法(cron から): deploy/crontab.example を参照。
# 手動実行する場合:
#   APP_DIR=/opt/kimi-no-anime-wa bash deploy/sync-anilist-cron.sh
#
# ログは呼び出し元(crontab)の `>> logs/anilist-sync-cron.log 2>&1` で
# ファイルに書き出す想定。ここでは開始・終了に分かりやすいタイムスタンプ付きの
# 区切り行を出力するだけに留める。ログのローテーションは
# deploy/logrotate.conf を参照。
# ============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/kimi-no-anime-wa}"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE="${ENV_FILE:-.env.production}"

cd "$APP_DIR"

echo "===== [$(date '+%Y-%m-%d %H:%M:%S')] AniList バッチ同期を開始します ====="
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" --profile tools run --rm anilist-sync
echo "===== [$(date '+%Y-%m-%d %H:%M:%S')] AniList バッチ同期が終了しました ====="
