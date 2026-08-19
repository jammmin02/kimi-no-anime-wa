// 対話型おすすめチャットボット(P2-2): ユーザーと自然な対話を重ねながら、Claude API に
// 自体データベースを検索させ、実在する作品だけをおすすめするサービス。
//
// ハルシネーション対策の設計:
// - Claude は自体 DB の内容を直接知らない。作品に言及する前に必ず search_db_works
//   ツールで DB に問い合わせさせ、その結果に出てきた id だけを「確認済み」として集める。
// - 最終的なおすすめ提示は必ず present_recommendations ツール経由で行わせ、その
//   workIds を「確認済み」集合と照合してから採用する(集合に無い id は無条件で除外)。
// - さらに呼び出し元(server/services/chat.ts)側でも、採用された id を自体 DB に
//   再照会してから画面表示用データを組み立てるため、二重に実在確認される。
//
// プロンプトキャッシュ:
// - システムプロンプト(役割・厳守事項)とツール定義は毎リクエスト完全に同一のため、
//   system の末尾ブロックに cache_control を付けるだけで tools + system がまとめて
//   キャッシュされる(shared/prompt-caching.md の「Large system prompt」パターン)。
// - 会話履歴(messages)は毎ターン伸びていく「コンテキスト」だが、直前ターンまでの
//   内容は次のリクエストでも同一のプレフィックスになるため、送信直前のメッセージ配列の
//   末尾ブロックにも cache_control を付け、会話が長くなるほど再処理コストが増えない
//   ようにしている(同ファイルの「Multi-turn conversations」パターン)。

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

import {
  CHAT_MAX_OUTPUT_TOKENS,
  CHAT_MAX_TOOL_ITERATIONS,
  CHAT_MODEL,
  CHAT_SEARCH_CANDIDATE_LIMIT,
} from '@/lib/constants/chat';
import type { ChatErrorCode, ChatHistory } from '@/lib/types/chat';
import { prisma } from '@/server/db/client';
import { rankByOwnReviews } from '@/server/services/ranking';

/** Claude API 呼び出し失敗時に投げるエラー。呼び出し側で code を見て文言(ja.ts)に変換する。 */
export class ChatServiceError extends Error {
  constructor(
    public readonly code: ChatErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ChatServiceError';
  }
}

// ANTHROPIC_API_KEY が未設定の環境でもモジュール読み込み自体は失敗させたくないため、
// 実際にチャットが呼ばれた時点で初めてクライアントを生成する(naturalLanguageSearch.ts と同じ方針)。
let cachedClient: Anthropic | undefined;

function getClient(): Anthropic {
  if (!cachedClient) {
    cachedClient = new Anthropic();
  }
  return cachedClient;
}

// Claude はこの厳守事項に従い、search_db_works で確認していない作品名を語らないことが
// 期待されるが、それでも present_recommendations の workIds は必ずコード側で
// 「確認済み id 集合」と照合してから採用する(下の runRecommendationChatTurn 参照)。
const SYSTEM_PROMPT = [
  'あなたは「君のアニメは」というアニメ/マンガ推薦サービスの、対話型おすすめアシスタントです。',
  '',
  '# 役割',
  'ユーザーと自然な対話を重ねながら好み(ジャンル・雰囲気・過去に好きだった作品など)を',
  '引き出し、自体データベースに実在する作品だけをおすすめしてください。',
  '',
  '# 厳守事項(最重要)',
  '- あなたは自体データベースの内容を直接知りません。作品名や内容に言及する前に、必ず',
  '  search_db_works ツールでデータベースを検索し、実在する候補を確認してください。',
  '- 検索結果に出てこない作品名を、あなた自身の知識だけで作り出して言及してはいけません。',
  '- 実際に作品を提示する準備ができたら、必ず present_recommendations ツールを使ってください。',
  '  workIds には、この会話中に search_db_works が返した作品の id のみを指定できます',
  '  (それ以外の id を指定しても、実在確認できないため画面には表示されません)。',
  '- ユーザーの好みがまだ曖昧な場合は、ツールを使わずに自然な言葉で 1〜2 個程度の',
  '  簡潔な follow-up 質問をしてください(好きなジャンル・雰囲気・既視聴作品など)。',
  '- 常に日本語で、親しみやすく簡潔に応答してください。',
].join('\n');

const SEARCH_TOOL: Anthropic.Tool = {
  name: 'search_db_works',
  description:
    'ジャンル・タグ・タイトルキーワードの組み合わせで自体データベース(作品マスター)を検索し、' +
    '実在する候補作品の一覧(id・タイトル・ジャンル・タグ・自体レビューの平均評価・レビュー件数)を' +
    '返す。作品を推薦する前に、必ずこのツールで候補が実在することを確認すること。' +
    '条件を何も指定しない場合、または該当作品が無い場合は空配列が返る。',
  input_schema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['ANIME', 'MANGA'],
        description: '作品種別で絞り込みたい場合に指定する。',
      },
      genres: {
        type: 'array',
        items: { type: 'string' },
        description: '検索したいジャンル。',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: '検索したい AniList タグ名。',
      },
      keywords: {
        type: 'array',
        items: { type: 'string' },
        description: '作品タイトルの一部として検索したいキーワード。',
      },
    },
    required: [],
  },
};

const PRESENT_RECOMMENDATIONS_TOOL: Anthropic.Tool = {
  name: 'present_recommendations',
  description:
    'ユーザーへの最終的なおすすめ提示を行う。workIds には、この会話中に search_db_works が' +
    '実際に返した作品の id のみを指定すること。message には、おすすめ理由を含む自然な返答文を書く。',
  input_schema: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'ユーザーに表示する返答文(日本語)。',
      },
      workIds: {
        type: 'array',
        items: { type: 'number' },
        description: 'search_db_works の結果から選んだ、推薦する作品の id 一覧。',
      },
    },
    required: ['message', 'workIds'],
  },
};

const SearchDbWorksInputSchema = z.object({
  type: z.enum(['ANIME', 'MANGA']).optional(),
  genres: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
});

const PresentRecommendationsInputSchema = z.object({
  message: z.string(),
  workIds: z.array(z.number()),
});

/** search_db_works ツールの実行結果として Claude に返す候補作品。 */
interface ChatCandidateWork {
  id: number;
  type: 'ANIME' | 'MANGA';
  titleRomaji: string | null;
  titleEnglish: string | null;
  titleNative: string | null;
  genres: string[];
  tags: string[];
  averageRating: number | null;
  reviewCount: number;
}

/**
 * search_db_works ツールの実処理。ジャンル/タグ/キーワードのいずれかを含む作品を
 * 自体 DB から検索する(条件を何も渡されなかった場合は無条件で空配列を返す = 全件検索はしない)。
 */
async function searchDbWorks(rawInput: unknown): Promise<ChatCandidateWork[]> {
  const parsed = SearchDbWorksInputSchema.safeParse(rawInput);
  if (!parsed.success) return [];

  const { type, genres = [], tags = [], keywords = [] } = parsed.data;
  if (genres.length === 0 && tags.length === 0 && keywords.length === 0) return [];

  const works = await prisma.work.findMany({
    where: {
      ...(type ? { type } : {}),
      OR: [
        ...(genres.length > 0 ? [{ genres: { hasSome: genres } }] : []),
        ...(tags.length > 0
          ? [{ tags: { some: { name: { in: tags, mode: 'insensitive' as const } } } }]
          : []),
        ...keywords.flatMap((keyword) => [
          { titleRomaji: { contains: keyword, mode: 'insensitive' as const } },
          { titleEnglish: { contains: keyword, mode: 'insensitive' as const } },
          { titleNative: { contains: keyword, mode: 'insensitive' as const } },
        ]),
      ],
    },
    select: {
      id: true,
      type: true,
      titleRomaji: true,
      titleEnglish: true,
      titleNative: true,
      genres: true,
      tags: { select: { name: true } },
    },
    take: CHAT_SEARCH_CANDIDATE_LIMIT,
  });
  if (works.length === 0) return [];

  // 平均評価・レビュー件数の集計は、通常のランキング(server/services/ranking.ts)と
  // 同じロジックを再利用する(自体レビュー基準という規則を常に一致させるため)。
  const { ranked, insufficient } = await rankByOwnReviews(
    works.map((work) => ({ ...work, coverImageUrl: null })),
  );
  const entryByWorkId = new Map(
    [...ranked, ...insufficient].map((entry) => [entry.work.id, entry]),
  );

  return works.map((work) => {
    const entry = entryByWorkId.get(work.id);
    return {
      id: work.id,
      type: work.type,
      titleRomaji: work.titleRomaji,
      titleEnglish: work.titleEnglish,
      titleNative: work.titleNative,
      genres: work.genres,
      tags: work.tags.map((tag) => tag.name),
      averageRating: entry?.averageRating ?? null,
      reviewCount: entry?.reviewCount ?? 0,
    };
  });
}

/**
 * 会話履歴に含まれる過去の search_db_works の tool_result から、これまでに実在確認済みの
 * 作品 id 集合を再構築する。present_recommendations の workIds を検証する土台になる。
 *
 * tool_use_id と tool 名の対応を辿るのではなく、tool_result の内容が
 * ChatCandidateWork[] っぽい JSON 配列かどうかで判定する(present_recommendations の
 * tool_result は 'ok' という文字列のため JSON.parse が失敗し、自然に除外される)。
 */
function collectVerifiedWorkIds(messages: Anthropic.MessageParam[]): Set<number> {
  const ids = new Set<number>();
  for (const message of messages) {
    if (message.role !== 'user' || typeof message.content === 'string') continue;
    for (const block of message.content) {
      if (block.type !== 'tool_result' || typeof block.content !== 'string') continue;
      try {
        const parsed: unknown = JSON.parse(block.content);
        if (!Array.isArray(parsed)) continue;
        for (const item of parsed) {
          if (
            item &&
            typeof item === 'object' &&
            typeof (item as { id?: unknown }).id === 'number'
          ) {
            ids.add((item as { id: number }).id);
          }
        }
      } catch {
        // JSON でない tool_result(present_recommendations の 'ok' 応答など)は無視する。
      }
    }
  }
  return ids;
}

function extractText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

/**
 * メッセージ配列をコピーし、最後のメッセージの最後のコンテンツブロックに
 * cache_control を付与したものを返す(元の配列・オブジェクトは変更しない)。
 * これが「直前ターンまでの会話」を次回以降のリクエストでキャッシュから読むための
 * ブレークポイントになる(shared/prompt-caching.md の Multi-turn conversations パターン)。
 */
function withHistoryCacheBreakpoint(messages: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  if (messages.length === 0) return messages;

  const lastIndex = messages.length - 1;
  const lastMessage = messages[lastIndex];
  // 文字列 content は cache_control を付けられる粒度が無いため対象外にする
  // (この関数の呼び出し元では常に配列 content のはずだが、型安全のため防御しておく)。
  if (typeof lastMessage.content === 'string' || lastMessage.content.length === 0) {
    return messages;
  }

  const content = [...lastMessage.content];
  const lastBlockIndex = content.length - 1;
  const lastBlock = content[lastBlockIndex];

  // cache_control を持てないブロック種別(thinking 等)には付与しない。
  if (
    lastBlock.type !== 'text' &&
    lastBlock.type !== 'tool_result' &&
    lastBlock.type !== 'tool_use'
  ) {
    return messages;
  }

  content[lastBlockIndex] = { ...lastBlock, cache_control: { type: 'ephemeral' } };
  return [...messages.slice(0, lastIndex), { ...lastMessage, content }];
}

async function callClaude(messages: Anthropic.MessageParam[]): Promise<Anthropic.Message> {
  try {
    return await getClient().messages.create({
      model: CHAT_MODEL,
      max_tokens: CHAT_MAX_OUTPUT_TOKENS,
      // 会話の意図把握・雑談か推薦かの判断に一定の推論が要るが、応答自体は短文のため
      // effort は中程度に留めてコストを抑える。
      output_config: { effort: 'medium' },
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      tools: [SEARCH_TOOL, PRESENT_RECOMMENDATIONS_TOOL],
      messages: withHistoryCacheBreakpoint(messages),
    });
  } catch (error) {
    // 最も具体的な例外から順に判定する(naturalLanguageSearch.ts と同じ方針)。
    if (error instanceof Anthropic.RateLimitError) {
      throw new ChatServiceError(
        'rateLimited',
        `Claude API のレートリミットに達しました: ${error.message}`,
      );
    }
    if (error instanceof Anthropic.APIConnectionError) {
      throw new ChatServiceError(
        'claudeUnavailable',
        `Claude API への接続に失敗しました: ${error.message}`,
      );
    }
    if (error instanceof Anthropic.APIError) {
      throw new ChatServiceError(
        'claudeUnavailable',
        `Claude API の呼び出しに失敗しました: ${error.message}`,
      );
    }
    throw new ChatServiceError(
      'generic',
      `チャット処理中に予期しないエラーが発生しました: ${String(error)}`,
    );
  }
}

/** 反復回数の上限に達しても最終回答が得られなかった場合のフォールバック文言。 */
const FALLBACK_REPLY_TEXT =
  '申し訳ありません、うまく回答をまとめられませんでした。もう少し具体的に好みを教えてください。';

export interface RecommendationChatTurnResult {
  replyText: string;
  history: ChatHistory;
  /** 自体 DB での実在確認を通過した、おすすめ対象の作品 id 一覧。 */
  recommendedWorkIds: number[];
}

/**
 * 会話 1 ターンを処理する。ユーザーの発言を履歴に追加した上で Claude を呼び出し、
 * 必要に応じて search_db_works / present_recommendations ツールの実行を挟みながら、
 * 最終的な返答テキストとおすすめ作品 id を確定させる。
 */
export async function runRecommendationChatTurn(
  history: ChatHistory,
  userMessage: string,
): Promise<RecommendationChatTurnResult> {
  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: 'user', content: [{ type: 'text', text: userMessage }] },
  ];

  const verifiedWorkIds = collectVerifiedWorkIds(messages);

  let replyText = '';
  let recommendedWorkIds: number[] = [];

  for (let iteration = 0; iteration < CHAT_MAX_TOOL_ITERATIONS; iteration += 1) {
    const response = await callClaude(messages);
    messages.push({ role: 'assistant', content: response.content });

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );

    if (toolUseBlocks.length === 0) {
      replyText = extractText(response.content);
      break;
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    // 1. まず search_db_works を全て処理し、確認済み id 集合を更新する。
    //    (同一ターン内で search と present が同時に呼ばれた場合に備えて、判定より先に行う)
    for (const block of toolUseBlocks) {
      if (block.name !== 'search_db_works') continue;
      const works = await searchDbWorks(block.input);
      works.forEach((work) => verifiedWorkIds.add(work.id));
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(works),
      });
    }

    // 2. 続けて present_recommendations を処理する。
    let didPresent = false;
    for (const block of toolUseBlocks) {
      if (block.name !== 'present_recommendations') continue;
      const parsed = PresentRecommendationsInputSchema.safeParse(block.input);
      if (parsed.success) {
        replyText = parsed.data.message;
        // ハルシネーション対策の中核: 確認済み id 集合に無い id は無条件で除外する。
        recommendedWorkIds = parsed.data.workIds.filter((id) => verifiedWorkIds.has(id));
      }
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: 'ok' });
      didPresent = true;
    }

    // 未知のツール名(想定外)は無視しつつ、会話構造を壊さないよう必ず tool_result で応答する。
    for (const block of toolUseBlocks) {
      if (block.name === 'search_db_works' || block.name === 'present_recommendations') continue;
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: 'unknown tool',
        is_error: true,
      });
    }

    messages.push({ role: 'user', content: toolResults });

    if (didPresent) break;
  }

  if (!replyText) {
    replyText = FALLBACK_REPLY_TEXT;
  }

  return { replyText, history: messages, recommendedWorkIds };
}
