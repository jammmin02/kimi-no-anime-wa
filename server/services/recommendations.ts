// 取り好みキーワード基準のおすすめ機能(P1-6)。
//
// P1-1 で保存したユーザーの取り好みキーワードと、AniList 同期時に保存した WorkTag
// (タグ名 + 連関度 %)を突き合わせるだけの、純粋なコンテンツベースマッチングで
// 実装する。ここでは Claude API 等の AI は一切使わない。
//
// おすすめ理由を Claude で自然文にする処理(P2-4)は、ここが返す matchedKeywords /
// matchedTagNames を入力として server/services/recommendationReasons.ts が行う
// (責務を分離し、このファイルはコンテンツベースの一致計算のみを担当する)。

import { prisma } from '@/server/db/client';
import type { WorkType } from '@/server/db/generated/prisma/enums';

/** おすすめカードの表示に必要な最小限の作品フィールド。 */
export interface RecommendedWork {
  id: number;
  type: WorkType;
  titleRomaji: string | null;
  titleEnglish: string | null;
  titleNative: string | null;
  coverImageUrl: string | null;
}

export interface RecommendationEntry {
  work: RecommendedWork;
  /** 一致した WorkTag.rank(連関度 %)の合計値。おすすめの並び順に使う素点。 */
  score: number;
  /**
   * この作品に対して実際に一致したユーザーの取り好みキーワード一覧(重複なし)。
   * おすすめ理由の自然文生成(P2-4)への入力として使う。
   */
  matchedKeywords: string[];
  /**
   * この作品に対して実際に一致した WorkTag.name(タグ名)一覧(重複なし)。
   * おすすめ理由の自然文生成(P2-4)への入力として使う。
   */
  matchedTagNames: string[];
}

// キーワードとタグ名の照合(大文字小文字を無視した部分一致)。
// AniList のタグ名は基本的に英語表記のため、日本語の取り好みキーワードとは
// 文字列としてほぼ一致しない場合が多いが、それを翻訳・意味的に補うのは
// このフェーズの範囲外(あくまで文字列ベースのコンテンツマッチングに留める)。
function keywordMatchesTag(keyword: string, tagName: string): boolean {
  return tagName.toLowerCase().includes(keyword.toLowerCase());
}

/**
 * ユーザーの取り好みキーワードから、コンテンツベース(キーワード-タグ連関度 %)で
 * おすすめ作品を計算する。
 *
 * @param tasteKeywords ユーザーが登録した取り好みキーワード(空配列なら常に空を返す)。
 * @param limit 返す件数の上限。
 */
export async function computeTasteBasedRecommendations(
  tasteKeywords: string[],
  limit: number,
): Promise<RecommendationEntry[]> {
  if (tasteKeywords.length === 0) {
    return [];
  }

  // まず DB 側で「いずれかのキーワードを部分一致で含むタグ」だけに絞り込む
  // (ILIKE を使った絞り込みを Prisma の contains + insensitive モードに任せる)。
  // どのキーワードが実際に一致したかは、絞り込んだ後にアプリ側で再判定する。
  const matchedTags = await prisma.workTag.findMany({
    where: {
      OR: tasteKeywords.map((keyword) => ({
        name: { contains: keyword, mode: 'insensitive' as const },
      })),
    },
    select: {
      name: true,
      rank: true,
      work: {
        select: {
          id: true,
          type: true,
          titleRomaji: true,
          titleEnglish: true,
          titleNative: true,
          coverImageUrl: true,
        },
      },
    },
  });

  // 作品ごとに、一致したタグの連関度 %(rank)を合計してスコア化しつつ、
  // おすすめ理由生成用に一致したキーワード・タグ名の集合も集めていく。
  const entryByWorkId = new Map<
    number,
    {
      work: RecommendedWork;
      score: number;
      matchedKeywords: Set<string>;
      matchedTagNames: Set<string>;
    }
  >();

  for (const tag of matchedTags) {
    const matchingKeywords = tasteKeywords.filter((keyword) =>
      keywordMatchesTag(keyword, tag.name),
    );
    if (matchingKeywords.length === 0) continue;

    const entry = entryByWorkId.get(tag.work.id) ?? {
      work: tag.work,
      score: 0,
      matchedKeywords: new Set<string>(),
      matchedTagNames: new Set<string>(),
    };
    entry.score += tag.rank;
    matchingKeywords.forEach((keyword) => entry.matchedKeywords.add(keyword));
    entry.matchedTagNames.add(tag.name);
    entryByWorkId.set(tag.work.id, entry);
  }

  return Array.from(entryByWorkId.values())
    .map((entry) => ({
      work: entry.work,
      score: entry.score,
      matchedKeywords: Array.from(entry.matchedKeywords),
      matchedTagNames: Array.from(entry.matchedTagNames),
    }))
    .sort((a, b) => b.score - a.score || a.work.id - b.work.id)
    .slice(0, limit);
}
