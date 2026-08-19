import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* 今後、画像最適化(AniList 画像ドメインの許可)などの設定をここに追加していく */
  /* TODO: server/db/generated/prisma のバンドルでエラーが出る場合は
     serverExternalPackages に対象パッケージを追加することを検討する */
  output: 'standalone',
};

export default nextConfig;
