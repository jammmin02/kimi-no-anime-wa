// Prisma Client のシングルトンインスタンス。
//
// Prisma 7 からは driver adapter(ここでは node-postgres 用の @prisma/adapter-pg)を
// PrismaClient に明示的に渡す方式に変わったため、接続文字列は直接ここで読み込む。
// (参考: https://pris.ly/d/prisma7-client-config)
//
// また、Next.js の開発サーバーはホットリロードのたびにモジュールを再評価するため、
// 何も対策しないと PrismaClient のインスタンスが増え続けて DB 接続数を圧迫してしまう。
// そのため globalThis にキャッシュし、開発中は同じインスタンスを使い回すようにしている。
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from './generated/prisma/client.ts';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
