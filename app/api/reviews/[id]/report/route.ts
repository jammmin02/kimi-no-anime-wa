// レビュー通報 API(P1-4)。
// 通報内容の確認・対応(承認/却下)は Phase 1 の管理者ページ項目で扱う想定のため、
// ここでは PENDING 状態のまま溜めるだけにする。

import { NextResponse } from 'next/server';

import type { ReportErrorResponse } from '@/lib/types/reviews';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/db/client';
import type { ReportReason } from '@/server/db/generated/prisma/enums';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const VALID_REASONS: ReportReason[] = ['SPOILER', 'ABUSE', 'SPAM', 'OFF_TOPIC', 'OTHER'];

export async function POST(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json<ReportErrorResponse>({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const reviewId = Number(id);
  if (!Number.isInteger(reviewId)) {
    return NextResponse.json<ReportErrorResponse>({ error: 'notFound' }, { status: 404 });
  }

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, userId: true },
  });
  if (!review) {
    return NextResponse.json<ReportErrorResponse>({ error: 'notFound' }, { status: 404 });
  }
  // 自分自身のレビューは通報できない(UI 側でも通報ボタンを出さないが、念のためサーバー側でも防ぐ)。
  if (review.userId === user.id) {
    return NextResponse.json<ReportErrorResponse>({ error: 'generic' }, { status: 400 });
  }

  const body: unknown = await request.json().catch(() => null);
  const fields = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  const reason = fields.reason;

  if (typeof reason !== 'string' || !VALID_REASONS.includes(reason as ReportReason)) {
    return NextResponse.json<ReportErrorResponse>({ error: 'reasonRequired' }, { status: 400 });
  }

  // 同じユーザーが同じレビューを何度も通報できないようにする(schema.prisma の一意制約参照)。
  const existingReport = await prisma.reviewReport.findUnique({
    where: { reviewId_reporterId: { reviewId, reporterId: user.id } },
  });
  if (existingReport) {
    return NextResponse.json<ReportErrorResponse>({ error: 'alreadyReported' }, { status: 409 });
  }

  await prisma.reviewReport.create({
    data: { reviewId, reporterId: user.id, reason: reason as ReportReason },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
