// おすすめ理由自動生成(P2-4): 取り好みキーワード・一致タグ・自体レビューの平均評価を
// Claude API に渡して、「なぜおすすめか」を自然な日本語の文章として生成するサービス。
//
// 生成結果のキャッシュ(DB への保存・再利用判定)はこのモジュールの責務ではない。
// server/services/recommendationReasons.ts がキャッシュを見て、無ければここを呼び出す。

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

import { RECOMMENDATION_REASON_MODEL } from '@/lib/constants/recommendations';

/** Claude API 呼び出し失敗時に投げるエラー。呼び出し側で捕捉し、機械的な代替文言に切り替える。 */
export class RecommendationReasonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecommendationReasonError';
  }
}

export interface RecommendationReasonInput {
  /** 実際に一致したユーザーの取り好みキーワード。 */
  matchedKeywords: string[];
  /** 実際に一致した AniList タグ名。 */
  matchedTagNames: string[];
  /** 自体レビューの平均評価(1〜10 スケール)。レビューが 1 件も無ければ null。 */
  averageRating: number | null;
  /** 平均評価の元になったレビュー件数。 */
  reviewCount: number;
}

// ANTHROPIC_API_KEY が未設定の環境(ローカル未設定・CI 等)でもモジュール読み込み自体は
// 失敗させたくないため、実際に生成が呼ばれた時点で初めてクライアントを生成する
// (naturalLanguageSearch.ts と同じ方針)。
let cachedClient: Anthropic | undefined;

function getClient(): Anthropic {
  if (!cachedClient) {
    // 引数無しのコンストラクタは ANTHROPIC_API_KEY 環境変数を自動で読み込む。
    cachedClient = new Anthropic();
  }
  return cachedClient;
}

const RecommendationReasonSchema = z.object({
  reason: z
    .string()
    .describe('日本語で1〜2文の、自然でフレンドリーなおすすめ理由(前置き・箇条書き・見出しは不要)'),
});

function buildSystemPrompt(): string {
  return [
    'あなたはアニメ/マンガ推薦サービスのコピーライターです。',
    '与えられたデータだけを根拠にして、ユーザーになぜこの作品がおすすめなのかを',
    '日本語で1〜2文の自然な文章として書いてください。',
    '',
    '重要: あなたには作品タイトルを渡さない。これは、あなたがその作品名から',
    'あらすじ・キャラクター名・世界観設定・評判などを連想して書いてしまい、',
    '実際には渡されていない(誤っているかもしれない)情報を紛れ込ませることを',
    '防ぐためである。「一致した取り好みキーワード・一致したタグ・自体レビューの',
    '平均評価」の3種類の情報だけを根拠にすること。',
    '',
    '制約:',
    '- 「一致したキーワード」「一致したタグ」は自然な言葉に言い換えてよいが、',
    '  存在しないキーワード・タグを創作しないこと。',
    '- 平均評価が無い(null)場合は、評価の話には一切触れないこと。',
    '- 見出し・箇条書き・絵文字は使わないこと。',
    '- 作品名・固有名詞・キャラクター名など、渡されていない情報は一切書かないこと。',
  ].join('\n');
}

function buildUserMessage(input: RecommendationReasonInput): string {
  const lines = [
    `一致した取り好みキーワード: ${input.matchedKeywords.join('、') || 'なし'}`,
    `一致したタグ: ${input.matchedTagNames.join('、') || 'なし'}`,
  ];
  if (input.averageRating != null) {
    lines.push(
      `自体レビューの平均評価: 10点満点中 ${input.averageRating.toFixed(1)}点(${input.reviewCount}件のレビュー)`,
    );
  } else {
    lines.push('自体レビューの平均評価: まだレビューがありません');
  }
  return lines.join('\n');
}

/**
 * 取り好みキーワード・一致タグ・自体レビューの平均評価から、おすすめ理由の自然文を生成する。
 *
 * Claude API の呼び出しに失敗した場合は RecommendationReasonError を投げるので、
 * 呼び出し側で必ず捕捉し、機械的なフォールバック文言に切り替えること。
 */
export async function generateRecommendationReason(
  input: RecommendationReasonInput,
): Promise<string> {
  try {
    const response = await getClient().messages.parse({
      model: RECOMMENDATION_REASON_MODEL,
      max_tokens: 300,
      output_config: {
        // haiku は effort パラメータ(拡張思考の強度調整)に対応していないため指定しない。
        format: zodOutputFormat(RecommendationReasonSchema),
      },
      system: buildSystemPrompt(),
      messages: [{ role: 'user', content: buildUserMessage(input) }],
    });

    if (!response.parsed_output) {
      throw new RecommendationReasonError(
        'Claude の応答をおすすめ理由として解析できませんでした。',
      );
    }

    return response.parsed_output.reason;
  } catch (error) {
    if (error instanceof RecommendationReasonError) {
      throw error;
    }
    // 最も具体的な例外から順に判定する(rate_limit_error → 接続エラー → その他の API エラー)。
    if (error instanceof Anthropic.RateLimitError) {
      throw new RecommendationReasonError(
        `Claude API のレートリミットに達しました: ${error.message}`,
      );
    }
    if (error instanceof Anthropic.APIConnectionError) {
      throw new RecommendationReasonError(`Claude API への接続に失敗しました: ${error.message}`);
    }
    if (error instanceof Anthropic.APIError) {
      throw new RecommendationReasonError(`Claude API の呼び出しに失敗しました: ${error.message}`);
    }
    throw new RecommendationReasonError(
      `おすすめ理由の生成中に予期しないエラーが発生しました: ${String(error)}`,
    );
  }
}
