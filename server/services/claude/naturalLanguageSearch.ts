// 自然言語検索(P2-1): ユーザーの自然言語クエリから、Claude API を使って関連する
// ジャンル/タグの組み合わせを抽出するサービス。
//
// 重要: このモジュールが返すのはジャンル/タグの「候補」のみ。実際の作品絞り込みと
// 並び替え(自体レビュー基準のランキング規則)は呼び出し側(server/services/search.ts)
// の責務とする。また ANTHROPIC_API_KEY は環境変数からのみ読み込む(コード中に埋め込まない)。

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

import { SEARCH_MODEL } from '@/lib/constants/search';
import type { SearchErrorCode } from '@/lib/types/search';

/** Claude API 呼び出し失敗時に投げるエラー。呼び出し側で code を見て文言(ja.ts)に変換する。 */
export class NaturalLanguageSearchError extends Error {
  constructor(
    public readonly code: SearchErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'NaturalLanguageSearchError';
  }
}

// ANTHROPIC_API_KEY が未設定の環境(ローカル未設定・CI 等)でもモジュール読み込み自体は
// 失敗させたくないため、実際に検索が呼ばれた時点で初めてクライアントを生成する。
let cachedClient: Anthropic | undefined;

function getClient(): Anthropic {
  if (!cachedClient) {
    // 引数無しのコンストラクタは ANTHROPIC_API_KEY 環境変数を自動で読み込む。
    cachedClient = new Anthropic();
  }
  return cachedClient;
}

const SearchFiltersSchema = z.object({
  genres: z.array(z.string()).describe('クエリに関連するジャンル(候補ジャンル一覧の中から選ぶ)'),
  tags: z.array(z.string()).describe('クエリに関連するタグ(候補タグ一覧の中から選ぶ)'),
});

export interface ExtractedSearchFilters {
  genres: string[];
  tags: string[];
}

function buildSystemPrompt(availableGenres: string[], availableTags: string[]): string {
  return [
    'あなたはアニメ/マンガ検索サービスの検索アシスタントです。',
    'ユーザーの自然言語による検索クエリの意図を汲み取り、以下の候補一覧の中に実在する',
    'ジャンルとタグだけを選んで、関連する組み合わせを抽出してください。',
    '候補一覧に存在しない値を作り出してはいけません。関連するものが無い場合は',
    'それぞれ空配列を返してください。',
    '',
    `候補ジャンル一覧: ${availableGenres.join(', ')}`,
    `候補タグ一覧: ${availableTags.join(', ')}`,
  ].join('\n');
}

/**
 * Claude の出力に含まれ得る表記揺れ(大文字小文字など)を吸収しつつ、候補一覧に
 * 実在する値だけを残す。候補外の値(ハルシネーション)を自体 DB の絞り込みに
 * そのまま使ってしまわないための防御。
 */
function normalizeAgainstKnownValues(values: string[], known: string[]): string[] {
  const knownByLowerCase = new Map(known.map((value) => [value.toLowerCase(), value]));
  const normalized = new Set<string>();
  for (const value of values) {
    const match = knownByLowerCase.get(value.toLowerCase());
    if (match) normalized.add(match);
  }
  return Array.from(normalized);
}

/**
 * 自然言語クエリから、既知のジャンル/タグ候補一覧に基づいて関連する組み合わせを抽出する。
 *
 * Claude API の呼び出しに失敗した場合(レートリミット・接続エラー・その他 API エラー)は
 * NaturalLanguageSearchError を投げるので、呼び出し側で必ず捕捉してユーザーに通知すること。
 */
export async function extractSearchFilters(
  query: string,
  availableGenres: string[],
  availableTags: string[],
): Promise<ExtractedSearchFilters> {
  try {
    const response = await getClient().messages.parse({
      model: SEARCH_MODEL,
      max_tokens: 1024,
      output_config: {
        // 単純な分類/抽出タスクのため、コストと速度を優先して低めの effort にする。
        effort: 'low',
        format: zodOutputFormat(SearchFiltersSchema),
      },
      system: buildSystemPrompt(availableGenres, availableTags),
      messages: [{ role: 'user', content: query }],
    });

    if (!response.parsed_output) {
      throw new NaturalLanguageSearchError(
        'generic',
        'Claude の応答を検索条件として解析できませんでした。',
      );
    }

    return {
      genres: normalizeAgainstKnownValues(response.parsed_output.genres, availableGenres),
      tags: normalizeAgainstKnownValues(response.parsed_output.tags, availableTags),
    };
  } catch (error) {
    if (error instanceof NaturalLanguageSearchError) {
      throw error;
    }
    // 最も具体的な例外から順に判定する(rate_limit_error → 接続エラー → その他の API エラー)。
    if (error instanceof Anthropic.RateLimitError) {
      throw new NaturalLanguageSearchError(
        'rateLimited',
        `Claude API のレートリミットに達しました: ${error.message}`,
      );
    }
    if (error instanceof Anthropic.APIConnectionError) {
      throw new NaturalLanguageSearchError(
        'claudeUnavailable',
        `Claude API への接続に失敗しました: ${error.message}`,
      );
    }
    if (error instanceof Anthropic.APIError) {
      throw new NaturalLanguageSearchError(
        'claudeUnavailable',
        `Claude API の呼び出しに失敗しました: ${error.message}`,
      );
    }
    throw new NaturalLanguageSearchError(
      'generic',
      `自然言語検索の処理中に予期しないエラーが発生しました: ${String(error)}`,
    );
  }
}
