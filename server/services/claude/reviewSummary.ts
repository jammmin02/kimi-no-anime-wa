// 別点区間別 AI レビュー要約(P2-3): 作品ごと・星評価区間ごとのレビュー本文を
// Claude API に渡して、その区間の傾向を日本語の文章で要約してもらうサービス。
//
// このモジュールは「1 区間分のレビューを渡して要約文を 1 つ受け取る」という
// 薄い責務のみを持つ。キャッシュの要否判定・区間分けなど呼び出し側の責務は
// server/services/reviewSummaries.ts が担う。ANTHROPIC_API_KEY は環境変数からのみ
// 読み込む(コード中に埋め込まない、naturalLanguageSearch.ts と同じ方針)。

import Anthropic from '@anthropic-ai/sdk';

import {
  MAX_REVIEWS_PER_SUMMARY_PROMPT,
  REVIEW_SUMMARY_MODEL,
} from '@/lib/constants/reviewSummaries';
import type { ReviewSummaryErrorCode } from '@/lib/types/reviewSummaries';
import type { RatingBand } from '@/server/db/generated/prisma/enums';

/** Claude API 呼び出し失敗時に投げるエラー。呼び出し側で code を見て文言(ja.ts)に変換する。 */
export class ReviewSummaryError extends Error {
  constructor(
    public readonly code: ReviewSummaryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ReviewSummaryError';
  }
}

// naturalLanguageSearch.ts と同様、ANTHROPIC_API_KEY 未設定の環境でもモジュール読み込み
// 自体は失敗させたくないため、実際に要約が呼ばれた時点で初めてクライアントを生成する。
let cachedClient: Anthropic | undefined;

function getClient(): Anthropic {
  if (!cachedClient) {
    cachedClient = new Anthropic();
  }
  return cachedClient;
}

const BAND_LABELS_JA: Record<RatingBand, string> = {
  HIGH: '高評価',
  MEDIUM: '中間評価',
  LOW: '低評価',
};

export interface ReviewSummaryInput {
  rating: number;
  body: string;
  isSpoiler: boolean;
}

function buildSystemPrompt(band: RatingBand, workTitle: string): string {
  return [
    `あなたは「${workTitle}」という作品に投稿されたレビューを分析するアシスタントです。`,
    `これから渡すのは、10 点満点中の評価が「${BAND_LABELS_JA[band]}」の区間に該当する`,
    'レビュー本文の一覧です。',
    '',
    'これらのレビューに共通する意見・評価されている点・不満点などの傾向を、',
    '日本語で 3〜4 文程度の文章に要約してください。個々のレビュアーの発言をそのまま',
    '引用するのではなく、あくまで全体的な傾向としてまとめてください。',
    '',
    '「[ネタバレあり]」と付記されたレビューについては、結末や具体的な展開そのものには',
    '触れず、全体的な評価傾向の把握にのみ利用してください。',
  ].join('\n');
}

function buildUserMessage(reviews: ReviewSummaryInput[]): string {
  // トークン量とコストを抑えるため、直近のレビューを優先して上限件数で打ち切る
  // (呼び出し側が createdAt 降順で渡してくる前提。詳細は reviewSummaries.ts 参照)。
  const truncated = reviews.slice(0, MAX_REVIEWS_PER_SUMMARY_PROMPT);
  return truncated
    .map((review, index) => {
      const spoilerTag = review.isSpoiler ? '[ネタバレあり] ' : '';
      return `${index + 1}. (評価: ${review.rating}/10) ${spoilerTag}${review.body}`;
    })
    .join('\n\n');
}

/**
 * 1 つの星評価区間に属するレビュー群を Claude API に渡し、その傾向を要約した
 * 日本語の文章を 1 つ返す。
 *
 * Claude API の呼び出しに失敗した場合(レートリミット・接続エラー・その他 API エラー)は
 * ReviewSummaryError を投げるので、呼び出し側で必ず捕捉すること。
 */
export async function summarizeReviewBand(
  reviews: ReviewSummaryInput[],
  band: RatingBand,
  workTitle: string,
): Promise<string> {
  try {
    const response = await getClient().messages.create({
      model: REVIEW_SUMMARY_MODEL,
      max_tokens: 512,
      output_config: {
        // 単純な分類ではなく文章生成タスクのため、search.ts の抽出タスクより
        // 高めの effort を使う。
        effort: 'medium',
      },
      system: buildSystemPrompt(band, workTitle),
      messages: [{ role: 'user', content: buildUserMessage(reviews) }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || !textBlock.text.trim()) {
      throw new ReviewSummaryError('generic', 'Claude の応答からテキストを取得できませんでした。');
    }
    return textBlock.text.trim();
  } catch (error) {
    if (error instanceof ReviewSummaryError) {
      throw error;
    }
    // 最も具体的な例外から順に判定する(rate_limit_error → 接続エラー → その他の API エラー)。
    if (error instanceof Anthropic.RateLimitError) {
      throw new ReviewSummaryError(
        'rateLimited',
        `Claude API のレートリミットに達しました: ${error.message}`,
      );
    }
    if (error instanceof Anthropic.APIConnectionError) {
      throw new ReviewSummaryError(
        'claudeUnavailable',
        `Claude API への接続に失敗しました: ${error.message}`,
      );
    }
    if (error instanceof Anthropic.APIError) {
      throw new ReviewSummaryError(
        'claudeUnavailable',
        `Claude API の呼び出しに失敗しました: ${error.message}`,
      );
    }
    throw new ReviewSummaryError(
      'generic',
      `レビュー要約の処理中に予期しないエラーが発生しました: ${String(error)}`,
    );
  }
}
