#!/usr/bin/env bash
# ============================================================================
# EC2 インスタンス初回セットアップ用スクリプト(インスタンスごとに1回だけ実行する)。
#
# 対象: Amazon Linux 2023 または Ubuntu の EC2 インスタンス(t3.micro / t4g.micro,
#       1GB RAM の無料利用枠を想定)。
#
# 実行方法(EC2 に SSH ログインした状態で):
#   sudo bash deploy/setup-ec2.sh
#
# 行う内容:
#   1. Docker Engine + Docker Compose plugin のインストール
#   2. スワップファイルの作成(1GB RAM インスタンスでは実質必須。無いと
#      Next.js のビルドや LibreTranslate のモデル読み込み時に OOM Killer に
#      落とされる可能性が高い)
#   3. アプリ配置用ディレクトリ・ログ出力用ディレクトリの作成
# ============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/kimi-no-anime-wa}"
SWAP_FILE="/swapfile"
SWAP_SIZE_MB="${SWAP_SIZE_MB:-2048}"

echo "[setup] Docker のインストール状況を確認しています..."
if ! command -v docker >/dev/null 2>&1; then
  if command -v dnf >/dev/null 2>&1; then
    # Amazon Linux 2023 系
    dnf install -y docker
    systemctl enable --now docker

    # Amazon Linux のリポジトリには Compose plugin が無いことがあるため、
    # 公式バイナリを直接配置する。
    mkdir -p /usr/local/lib/docker/cli-plugins
    ARCH="$(uname -m)"
    case "$ARCH" in
      aarch64) COMPOSE_ARCH="aarch64" ;;
      *) COMPOSE_ARCH="x86_64" ;;
    esac
    curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-${COMPOSE_ARCH}" \
      -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
  elif command -v apt-get >/dev/null 2>&1; then
    # Ubuntu 系
    apt-get update
    apt-get install -y docker.io docker-compose-plugin
    systemctl enable --now docker
  else
    echo "[setup] 未対応のディストリビューションです。Docker を手動でインストールしてください。" >&2
    exit 1
  fi
else
  echo "[setup] Docker は既にインストールされています。スキップします。"
fi

# sudo なしで docker コマンドを使えるように、呼び出したユーザーを docker グループへ追加する。
TARGET_USER="${SUDO_USER:-$USER}"
usermod -aG docker "$TARGET_USER" || true
echo "[setup] ${TARGET_USER} を docker グループに追加しました(再ログイン後に反映されます)。"

echo "[setup] スワップファイルを確認しています(目標サイズ: ${SWAP_SIZE_MB}MB)..."
if [ ! -f "$SWAP_FILE" ]; then
  fallocate -l "${SWAP_SIZE_MB}M" "$SWAP_FILE" 2>/dev/null || dd if=/dev/zero of="$SWAP_FILE" bs=1M count="$SWAP_SIZE_MB"
  chmod 600 "$SWAP_FILE"
  mkswap "$SWAP_FILE"
  swapon "$SWAP_FILE"
  # 再起動後もスワップが有効になるよう fstab に登録する(重複登録防止のチェック付き)。
  if ! grep -q "^$SWAP_FILE" /etc/fstab; then
    echo "$SWAP_FILE none swap sw 0 0" >>/etc/fstab
  fi
  echo "[setup] スワップファイルを作成し、有効化しました。"
else
  echo "[setup] スワップファイルは既に存在します。スキップします。"
fi

echo "[setup] アプリ配置用ディレクトリを作成しています: $APP_DIR"
mkdir -p "$APP_DIR/logs"
chown -R "$TARGET_USER" "$APP_DIR"

echo "[setup] セットアップが完了しました。"
echo "[setup] 次の手順:"
echo "  1. 一度ログアウトして再ログインする(docker グループ反映のため)"
echo "  2. $APP_DIR にリポジトリを git clone する"
echo "  3. .env.production.example を .env.production としてコピーし、値を設定する"
echo "  4. deploy/deploy.sh を実行して初回デプロイを行う"
