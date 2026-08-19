// 作品ごとの保管庫(お気に入り/視聴・閲読状態)登録・変更・削除 API(P1-8)。
// LibraryEntry.userId + workId には一意制約があるため(schema.prisma 参照)、
// 状態変更は常に upsert として扱う。「未登録」に戻す操作は削除として扱う。

import { NextResponse } from 'next/server';

import type { LibraryErrorResponse } from '@/lib/types/library';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/db/client';
import type { LibraryStatus } from '@/server/db/generated/prisma/enums';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const VALID_STATUSES: LibraryStatus[] = ['PLANNING', 'WATCHING', 'COMPLETED', 'ON_HOLD', 'DROPPED'];

export async function PUT(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json<LibraryErrorResponse>({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const workId = Number(id);
  if (!Number.isInteger(workId)) {
    return NextResponse.json<LibraryErrorResponse>({ error: 'notFound' }, { status: 404 });
  }

  const work = await prisma.work.findUnique({ where: { id: workId }, select: { id: true } });
  if (!work) {
    return NextResponse.json<LibraryErrorResponse>({ error: 'notFound' }, { status: 404 });
  }

  const body: unknown = await request.json().catch(() => null);
  const status =
    typeof body === 'object' && body !== null ? (body as Record<string, unknown>).status : null;

  if (typeof status !== 'string' || !VALID_STATUSES.includes(status as LibraryStatus)) {
    return NextResponse.json<LibraryErrorResponse>({ error: 'invalidStatus' }, { status: 400 });
  }

  const entry = await prisma.libraryEntry.upsert({
    where: { userId_workId: { userId: user.id, workId } },
    create: { userId: user.id, workId, status: status as LibraryStatus },
    update: { status: status as LibraryStatus },
  });

  return NextResponse.json({ entry });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json<LibraryErrorResponse>({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const workId = Number(id);
  if (!Number.isInteger(workId)) {
    return NextResponse.json<LibraryErrorResponse>({ error: 'notFound' }, { status: 404 });
  }

  // 未登録の状態からの削除リクエストも冪等に成功として扱う。
  await prisma.libraryEntry.deleteMany({ where: { userId: user.id, workId } });

  return NextResponse.json({ ok: true });
}
