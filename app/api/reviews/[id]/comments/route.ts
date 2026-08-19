// レビューへのコメント投稿 API(P1-4)。
// 通報と同様、コメントの削除・非表示などの管理機能は Phase 1 の管理者ページ項目で
// 扱う想定のため、ここではデータを溜めるだけにする。

import { NextResponse } from 'next/server';

import { MAX_COMMENT_BODY_LENGTH } from '@/lib/constants/reviews';
import type { CommentErrorResponse } from '@/lib/types/reviews';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/db/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json<CommentErrorResponse>({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const reviewId = Number(id);
  if (!Number.isInteger(reviewId)) {
    return NextResponse.json<CommentErrorResponse>({ error: 'notFound' }, { status: 404 });
  }

  const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { id: true } });
  if (!review) {
    return NextResponse.json<CommentErrorResponse>({ error: 'notFound' }, { status: 404 });
  }

  const body: unknown = await request.json().catch(() => null);
  const fields = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  const commentBody = typeof fields.body === 'string' ? fields.body.trim() : '';

  if (!commentBody) {
    return NextResponse.json<CommentErrorResponse>({ error: 'bodyRequired' }, { status: 400 });
  }
  if (commentBody.length > MAX_COMMENT_BODY_LENGTH) {
    return NextResponse.json<CommentErrorResponse>({ error: 'bodyTooLong' }, { status: 400 });
  }

  const comment = await prisma.reviewComment.create({
    data: { reviewId, userId: user.id, body: commentBody },
    include: { user: { select: { id: true, nickname: true } } },
  });

  return NextResponse.json({ comment }, { status: 201 });
}
