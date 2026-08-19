// ============================================================================
// AniList GraphQL API への通信レイヤー。
//
// このモジュールは HTTP 通信とレートリミット対応のみを担当する
// (クエリの内容や DB へのマッピング/保存ロジックは sync.mts 側にある)。
//
// 重要: このモジュールはユーザーがページを開くたびに AniList を直接呼び出す構造では
// なく、scripts/sync-anilist.mts を通じて定期的に(バッチとして)実行されることを
// 前提にしている(P0-3)。AniList のレートリミット(基準は分あたり90回、一時的に
// 分あたり30回になっている場合がある)を守るため、以下の対策を行う。
//   1. リクエスト間に最小間隔を空ける(paceRequest)
//   2. 各レスポンスの X-RateLimit-Remaining ヘッダーを確認し、残数が少なければ
//      クールダウンする
//   3. 429 Too Many Requests を受け取ったら Retry-After ヘッダーの秒数だけ待って
//      リトライする
// ============================================================================

const ANILIST_API_URL = process.env.ANILIST_API_URL ?? 'https://graphql.anilist.co';

// リクエスト間の最小間隔(ms)。「一時的に分あたり30回」のケースでも安全なように
// デフォルトは 2000ms(=分あたり30回相当)にしている。分あたり90回に復旧したことが
// 確認できたら ANILIST_MIN_INTERVAL_MS 環境変数でより短く調整してよい。
const MIN_INTERVAL_MS = Number(process.env.ANILIST_MIN_INTERVAL_MS ?? 2000);

// 残りリクエスト数がこの値以下になったら、リミットのリセットを待つ目的でクールダウンする。
const REMAINING_SAFETY_BUFFER = 2;
// リミット残数ベースのクールダウン時間(ms)。AniList はリミットのリセット時刻を
// レスポンスヘッダーで返してくれないため、分単位のリミットを前提に余裕を持った
// 固定値を使う。
const REMAINING_COOLDOWN_MS = 60_000;
// 429 が連続した場合の最大リトライ回数(無限待機を防ぐため)。
const MAX_RETRIES = 5;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let lastRequestAt = 0;

async function paceRequest(): Promise<void> {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < MIN_INTERVAL_MS) {
    await sleep(MIN_INTERVAL_MS - elapsed);
  }
}

interface AniListGraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

/** AniList GraphQL API にレートリミットを守りながらリクエストを送る。 */
export async function anilistRequest<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    await paceRequest();
    lastRequestAt = Date.now();

    const res = await fetch(ANILIST_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
    });

    if (res.status === 429) {
      const retryAfterSec = Number(res.headers.get('retry-after') ?? '60');
      console.warn(
        `[anilist] 429 Too Many Requests — ${retryAfterSec}秒待機してリトライします (${attempt}/${MAX_RETRIES})`,
      );
      await sleep(retryAfterSec * 1000);
      continue;
    }

    const remainingHeader = res.headers.get('x-ratelimit-remaining');
    const remaining = remainingHeader !== null ? Number(remainingHeader) : null;

    const body = (await res.json()) as AniListGraphQLResponse<T>;

    if (!res.ok || body.errors?.length) {
      throw new Error(
        `AniList API リクエスト失敗: ${res.status} ${res.statusText} ${JSON.stringify(body.errors ?? [])}`,
      );
    }

    if (remaining !== null && remaining <= REMAINING_SAFETY_BUFFER) {
      console.warn(
        `[anilist] 残りリクエスト数 ${remaining} 件 — 安全のため ${REMAINING_COOLDOWN_MS / 1000}秒待機します`,
      );
      await sleep(REMAINING_COOLDOWN_MS);
    }

    if (body.data === undefined) {
      throw new Error('AniList API のレスポンスに data フィールドがありません。');
    }

    return body.data;
  }

  throw new Error('AniList API のリトライ回数上限に達しました(429 が繰り返し発生)。');
}
