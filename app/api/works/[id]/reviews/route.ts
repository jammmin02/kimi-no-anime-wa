// 作品ごとのレビュー投稿 API(P1-4)。
// Review.workId + Review.userId には一意制約があるため(schema.prisma 参照)、
// 同じユーザーが同じ作品に再投稿した場合は新規作成ではなく更新として扱う(upsert)。

import { NextResponse } from 'next/server';

import { MAX_RATING, MAX_REVIEW_BODY_LENGTH, MIN_RATING } from '@/lib/constants/reviews';
import type { ReviewErrorResponse } from '@/lib/types/reviews';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/db/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json<ReviewErrorResponse>({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const workId = Number(id);
  if (!Number.isInteger(workId)) {
    return NextResponse.json<ReviewErrorResponse>({ error: 'generic' }, { status: 400 });
  }

  const work = await prisma.work.findUnique({ where: { id: workId }, select: { id: true } });
  if (!work) {
    return NextResponse.json<ReviewErrorResponse>({ error: 'generic' }, { status: 404 });
  }

  const body: unknown = await request.json().catch(() => null);
  const fields = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};

  const rating = Number(fields.rating);
  const reviewBody = typeof fields.body === 'string' ? fields.body.trim() : '';
  const isSpoiler = fields.isSpoiler === true;

  if (!Number.isInteger(rating) || rating < MIN_RATING || rating > MAX_RATING) {
    return NextResponse.json<ReviewErrorResponse>({ error: 'invalidRating' }, { status: 400 });
  }
  if (!reviewBody) {
    return NextResponse.json<ReviewErrorResponse>({ error: 'bodyRequired' }, { status: 400 });
  }
  if (reviewBody.length > MAX_REVIEW_BODY_LENGTH) {
    return NextResponse.json<ReviewErrorResponse>({ error: 'bodyTooLong' }, { status: 400 });
  }

  // 1 ユーザー・1 作品につきレビューは 1 件のみ(再投稿は更新として扱う。schema.prisma 参照)。
  const review = await prisma.review.upsert({
    where: { workId_userId: { workId, userId: user.id } },
    create: { workId, userId: user.id, rating, body: reviewBody, isSpoiler },
    update: { rating, body: reviewBody, isSpoiler },
  });

  return NextResponse.json({ review });
}
