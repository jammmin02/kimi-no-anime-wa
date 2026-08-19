// ============================================================================
// 別点区間別 AI レビュー要約(P2-3)の動作確認用シードスクリプト。
//
// 実行方法:
//   npm run seed:reviews
//
// 重要: 事前に `npm run sync:anilist` を実行し、作品データが自体 DB に
// 同期済みであること(作品が 1 件も無い場合はエラーで終了する)。
//
// AniList 同期(P0-3)でアニメ/マンガ合わせて数千件規模の作品が入っている前提で、
// アニメ・マンガそれぞれから満遍なく(id 順に等間隔で)作品を選び、選ばれた作品には
// 「人気作(要約の最小レビュー数を大きく超える)」「並作(ランキングの最小件数は
// 超えるが要約の閾値未満)」「少数レビューのみ」の3段階からランダムに件数を割り当てる。
// これにより、一覧/ランキング/要約のどの画面でも「レビューが十分な作品」
// 「不足している作品」「レビュー自体が無い作品」が混在する、より実データに近い
// 状態を再現する。
//
// Review.workId + Review.userId には一意制約があるため(schema.prisma 参照)、
// 1 人のユーザーは 1 作品につき 1 件しかレビューを持てない。そのため、最も
// レビュー数が多い階層でも足りるだけのシードユーザーを用意した上でレビューを作成する。
// ============================================================================
import 'dotenv/config';

import {
  HIGH_RATING_BAND_MIN,
  LOW_RATING_BAND_MAX,
  MIN_REVIEWS_FOR_SUMMARY,
} from '../lib/constants/reviewSummaries.ts';
import { hashPassword } from '../server/auth/password.ts';
import { prisma } from '../server/db/client.ts';
import type { WorkType } from '../server/db/generated/prisma/enums.ts';

/** アニメ/マンガそれぞれから、レビューを付与する作品として選ぶ件数の上限。 */
const SEED_WORK_TARGET_BY_TYPE: Record<WorkType, number> = {
  ANIME: 150,
  MANGA: 150,
};

interface ReviewCountTier {
  min: number;
  max: number;
  /** ランダム抽選時の重み(合計に対する比率で選ばれる)。 */
  weight: number;
}

// 「人気作」「並作」「少数レビューのみ」の3段階。人気作は MIN_REVIEWS_FOR_SUMMARY(20件)を
// 大きく超え、並作はランキングの最小件数は満たすが要約の閾値には届かない件数にする。
const REVIEW_COUNT_TIERS: ReviewCountTier[] = [
  { min: 25, max: 60, weight: 2 },
  { min: 5, max: 19, weight: 5 },
  { min: 1, max: 4, weight: 3 },
];
const TOTAL_TIER_WEIGHT = REVIEW_COUNT_TIERS.reduce((sum, tier) => sum + tier.weight, 0);

function pickReviewCountTier(): ReviewCountTier {
  let roll = Math.random() * TOTAL_TIER_WEIGHT;
  for (const tier of REVIEW_COUNT_TIERS) {
    if (roll < tier.weight) return tier;
    roll -= tier.weight;
  }
  return REVIEW_COUNT_TIERS[REVIEW_COUNT_TIERS.length - 1];
}

// レビュー本文のテンプレート(星評価の区間別)。実データと混同しないよう、
// シード専用ユーザーの email には "review-seed-" という接頭辞を付けて区別する。
const HIGH_BAND_TEMPLATES = [
  '作画がとても綺麗で、毎話楽しみに見ていました。',
  'キャラクター同士の掛け合いが魅力的で、飽きずに一気に見進められました。',
  'ストーリー展開のテンポが良く、続きが気になる引きが上手いと思います。',
  '音楽と演出の相性が良く、盛り上がるシーンでは鳥肌が立ちました。',
  '原作の魅力をうまく落とし込めていて、満足度の高い出来だと思います。',
];
const MEDIUM_BAND_TEMPLATES = [
  '悪くはないですが、中盤の展開がやや冗長に感じました。',
  '作画は安定していますが、ストーリーは平均的だと思います。',
  '好きなキャラクターはいますが、全体としては可もなく不可もなくという印象です。',
  '前半は楽しめましたが、後半は少し失速した印象があります。',
  '見て損は無いですが、人に強く勧めるほどでは無いかなという感想です。',
];
const LOW_BAND_TEMPLATES = [
  '展開が急ぎ足で、原作を知らないと置いていかれる内容でした。',
  '作画の乱れが目立ち、集中して見られませんでした。',
  'キャラクターの行動に説得力が無く、感情移入できませんでした。',
  '期待していたほどの盛り上がりが無く、正直物足りなかったです。',
  '演出が単調で、途中で見るのをやめてしまいました。',
];

interface RatingBandChoice {
  min: number;
  max: number;
  templates: string[];
  /** ランダム抽選時の重み(合計に対する比率で選ばれる)。 */
  weight: number;
}

// 評価区間の境界は lib/constants/reviewSummaries.ts の値をそのまま使い、
// 本番側の区間分けロジック(server/services/reviewSummaries.ts)とズレないようにする。
const RATING_BAND_CHOICES: RatingBandChoice[] = [
  { min: HIGH_RATING_BAND_MIN, max: 10, templates: HIGH_BAND_TEMPLATES, weight: 4 },
  {
    min: LOW_RATING_BAND_MAX + 1,
    max: HIGH_RATING_BAND_MIN - 1,
    templates: MEDIUM_BAND_TEMPLATES,
    weight: 3,
  },
  { min: 1, max: LOW_RATING_BAND_MAX, templates: LOW_BAND_TEMPLATES, weight: 2 },
];
const TOTAL_BAND_WEIGHT = RATING_BAND_CHOICES.reduce((sum, choice) => sum + choice.weight, 0);

function pickRandomBandChoice(): RatingBandChoice {
  let roll = Math.random() * TOTAL_BAND_WEIGHT;
  for (const choice of RATING_BAND_CHOICES) {
    if (roll < choice.weight) return choice;
    roll -= choice.weight;
  }
  return RATING_BAND_CHOICES[RATING_BAND_CHOICES.length - 1];
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickRandom<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function buildReviewBody(templates: string[]): string {
  // テンプレートを2つ組み合わせて、文章量に多少のばらつきを持たせる。
  const first = pickRandom(templates);
  const rest = templates.filter((template) => template !== first);
  const second = pickRandom(rest.length > 0 ? rest : templates);
  return `${first} ${second}`;
}

/** 配列から、先頭を含みつつ等間隔で count 件を選ぶ(id 順の作品リストを満遍なく間引く用途)。 */
function pickEvenlySpaced<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items;
  const step = items.length / count;
  const picked: T[] = [];
  for (let i = 0; i < count; i += 1) {
    picked.push(items[Math.floor(i * step)]);
  }
  return picked;
}

async function main() {
  const works = await prisma.work.findMany({
    orderBy: { id: 'asc' },
    select: { id: true, type: true },
  });
  if (works.length === 0) {
    throw new Error(
      '作品データが1件もありません。先に `npm run sync:anilist` を実行して作品を同期してください。',
    );
  }

  const selectedWorks = (Object.keys(SEED_WORK_TARGET_BY_TYPE) as WorkType[]).flatMap((type) =>
    pickEvenlySpaced(
      works.filter((work) => work.type === type),
      SEED_WORK_TARGET_BY_TYPE[type],
    ),
  );

  // どの作品にも同じ乱数階層(REVIEW_COUNT_TIERS)から件数を割り当てるだけで済むように、
  // 事前に対象作品ごとの目標件数を決めておく。
  const targetCountByWorkId = new Map(
    selectedWorks.map((work) => {
      const tier = pickReviewCountTier();
      return [work.id, randomInt(tier.min, tier.max)] as const;
    }),
  );

  // 最も件数が多い作品でも足りるだけのシードユーザーを用意しておく
  // (1ユーザー1作品につき1件までのため)。
  const seedUserCount = Math.max(...Array.from(targetCountByWorkId.values()));
  // シード専用アカウントであることが分かるよう、パスワードハッシュは全員で使い回す
  // (どうせログイン用途では使わないダミーアカウントのため)。
  const sharedPasswordHash = await hashPassword('review-seed-password-do-not-use');

  const seedUsers: { id: number }[] = [];
  for (let i = 1; i <= seedUserCount; i += 1) {
    const email = `review-seed-${i}@example.invalid`;
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, passwordHash: sharedPasswordHash, nickname: `シードレビュアー${i}` },
      update: {},
      select: { id: true },
    });
    seedUsers.push(user);
  }

  let reviewCount = 0;
  for (const work of selectedWorks) {
    const targetCount = targetCountByWorkId.get(work.id) ?? 0;
    for (let i = 0; i < targetCount; i += 1) {
      const reviewer = seedUsers[i];
      const choice = pickRandomBandChoice();
      const rating = randomInt(choice.min, choice.max);
      const body = buildReviewBody(choice.templates);
      // ごく一部のレビューにネタバレフラグを付け、要約プロンプト側の
      // 「ネタバレレビューの扱い」も実データで確認できるようにする。
      const isSpoiler = Math.random() < 0.1;

      await prisma.review.upsert({
        where: { workId_userId: { workId: work.id, userId: reviewer.id } },
        create: { workId: work.id, userId: reviewer.id, rating, body, isSpoiler },
        update: { rating, body, isSpoiler },
      });
      reviewCount += 1;
    }
  }

  console.log(
    `[seed:reviews] ${selectedWorks.length} 作品(全 ${works.length} 作品中)に対して、` +
      `合計 ${reviewCount} 件のレビューを作成/更新しました(シードユーザー ${seedUsers.length} 名)。` +
      `要約表示の最小レビュー数は ${MIN_REVIEWS_FOR_SUMMARY} 件です。`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('[seed:reviews] シード実行に失敗しました:', error);
    process.exit(1);
  });
