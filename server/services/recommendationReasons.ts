// おすすめ理由の自動生成 + キャッシュ(P2-4)。
//
// server/services/recommendations.ts が計算した「コンテンツベースの一致結果」に対して、
// 取り好みキーワード・一致タグ・自体レビューの平均評価を Claude API に渡し、
// 自然な文章のおすすめ理由を生成して付与する。
//
// 同じユーザー・作品の組み合わせに毎回 Claude を呼び出すコストを避けるため、生成結果は
// RecommendationReason テーブルにキャッシュする。取り好みキーワードや一致タグ、平均評価
// といった入力が生成時から変わっていなければキャッシュをそのまま再利用し、変わった場合
// だけ再生成する(reviewSummaries と同様、入力のシグネチャを保存して突き合わせる方式)。

import { ja } from '@/lib/i18n/ja';
import { prisma } from '@/server/db/client';
import {
  generateRecommendationReason,
  RecommendationReasonError,
} from '@/server/services/claude/recommendationReason';
import type { RecommendationEntry } from '@/server/services/recommendations';

export interface RecommendationEntryWithReason extends RecommendationEntry {
  /** Claude が生成した(失敗時は機械的な代替の)おすすめ理由。 */
  reason: string;
}

// 入力(一致キーワード・一致タグ・平均評価)を正規化して比較可能な 1 本の文字列にする。
// 表示順や大文字小文字の違いだけでキャッシュが無効化されないよう、ソートしてから結合する。
function buildInputSignature(
  matchedKeywords: string[],
  matchedTagNames: string[],
  averageRating: number | null,
): string {
  const keywordsPart = [...matchedKeywords].sort().join(',');
  const tagsPart = [...matchedTagNames].sort().join(',');
  const ratingPart = averageRating != null ? averageRating.toFixed(1) : 'none';
  return `${keywordsPart}::${tagsPart}::${ratingPart}`;
}

/**
 * おすすめ一覧の各エントリに、Claude が生成した自然文のおすすめ理由を付与する。
 * 作品ごとの自体レビュー平均評価は、この関数の中でまとめて集計する。
 */
export async function attachRecommendationReasons(
  userId: number,
  entries: RecommendationEntry[],
): Promise<RecommendationEntryWithReason[]> {
  if (entries.length === 0) {
    return [];
  }

  const workIds = entries.map((entry) => entry.work.id);

  // 平均評価の集計とキャッシュ済み理由の取得は、それぞれ作品数分の個別クエリではなく
  // 1 回ずつのクエリにまとめて発行する。
  const [ratingAggregates, cachedReasons] = await Promise.all([
    prisma.review.groupBy({
      by: ['workId'],
      where: { workId: { in: workIds } },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.recommendationReason.findMany({
      where: { userId, workId: { in: workIds } },
    }),
  ]);

  const ratingByWorkId = new Map(
    ratingAggregates.map((aggregate) => [aggregate.workId, aggregate]),
  );
  const cacheByWorkId = new Map(cachedReasons.map((cache) => [cache.workId, cache]));

  return Promise.all(
    entries.map(async (entry) => {
      const rating = ratingByWorkId.get(entry.work.id);
      const averageRating = rating?._avg.rating ?? null;
      const reviewCount = rating?._count.rating ?? 0;
      const signature = buildInputSignature(
        entry.matchedKeywords,
        entry.matchedTagNames,
        averageRating,
      );

      const cached = cacheByWorkId.get(entry.work.id);
      if (cached && cached.inputSignature === signature) {
        return { ...entry, reason: cached.reason };
      }

      try {
        const reason = await generateRecommendationReason({
          matchedKeywords: entry.matchedKeywords,
          matchedTagNames: entry.matchedTagNames,
          averageRating,
          reviewCount,
        });

        await prisma.recommendationReason.upsert({
          where: { userId_workId: { userId, workId: entry.work.id } },
          create: { userId, workId: entry.work.id, inputSignature: signature, reason },
          update: { inputSignature: signature, reason },
        });

        return { ...entry, reason };
      } catch (error) {
        // Claude API が落ちていてもホーム画面の表示自体は壊さない。ログに残しつつ、
        // 機械的なフォールバック文言(P1-6 時点の表示と同等のもの)を返す。
        if (error instanceof RecommendationReasonError) {
          console.error(`[recommendationReasons] ${error.message}`);
        } else {
          console.error('[recommendationReasons] 予期しないエラー:', error);
        }
        return { ...entry, reason: ja.home.recommendations.reasonLabel(entry.matchedKeywords) };
      }
    }),
  );
}
