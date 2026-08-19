import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { ja } from '@/lib/i18n/ja';
import type { WorkRelationType, WorkType } from '@/server/db/generated/prisma/enums';

// このコンポーネントが実際に参照するフィールドのみを定義する(Prisma が返す
// 完全な Work 型をそのまま渡すこともできるが、依存する形を最小限に留める)。
interface RelatedWork {
  id: number;
  type: WorkType;
  titleRomaji: string | null;
  titleEnglish: string | null;
  titleNative: string | null;
  coverImageUrl: string | null;
}

export interface WorkRelationItem {
  relationType: WorkRelationType;
  // 関係先の作品がまだ自前 DB に同期されていない場合は null になる
  // (WorkRelation.targetWorkId が null のケース。schema.prisma 参照)。
  targetWork: RelatedWork | null;
}

interface WorkRelationsSectionProps {
  relations: WorkRelationItem[];
}

// セクション内でのグループ表示順。「原作 → アニメ化 → 前作/続編 → 外伝」という
// 関係性の流れに沿って並べる(グラフ描画までは行わず、グループ化した順序リストとして表現する)。
const RELATION_GROUP_ORDER: WorkRelationType[] = [
  'SOURCE',
  'ADAPTATION',
  'PREQUEL',
  'SEQUEL',
  'PARENT',
  'SIDE_STORY',
  'SPIN_OFF',
  'ALTERNATIVE',
  'SUMMARY',
  'COMPILATION',
  'CONTAINS',
  'CHARACTER',
  'OTHER',
];

function pickDisplayTitle(work: RelatedWork): string {
  return work.titleNative ?? work.titleRomaji ?? work.titleEnglish ?? `#${work.id}`;
}

/**
 * 原作-アニメ-続編-外伝などのつながりを表示するセクション(P1-3)。
 *
 * 注意: 「アニメが原作の何巻までの内容を扱っているか」は本プロジェクトでは
 * 自動化できないデータのため MVP 除外が確定している
 * (implementation_prompts_ko.md 参照)。このコンポーネントでは絶対に扱わない。
 */
export function WorkRelationsSection({ relations }: WorkRelationsSectionProps) {
  const resolved = relations.filter(
    (relation): relation is WorkRelationItem & { targetWork: RelatedWork } =>
      relation.targetWork !== null,
  );

  // relations データが無い(または対象作品が未同期で解決できない)作品では、
  // セクションごと自然に非表示にする。
  if (resolved.length === 0) {
    return null;
  }

  const groups = RELATION_GROUP_ORDER.map((relationType) => ({
    relationType,
    items: resolved.filter((relation) => relation.relationType === relationType),
  })).filter((group) => group.items.length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{ja.works.relations.sectionTitle}</CardTitle>
        <CardDescription>{ja.works.relations.sectionDescription}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {groups.map((group) => (
          <div key={group.relationType} className="flex flex-col gap-2">
            <h3 className="text-muted-foreground text-sm font-semibold">
              {ja.works.relations.relationTypeLabels[group.relationType]}
            </h3>
            <ul className="flex flex-col gap-2">
              {group.items.map((relation) => (
                <li key={`${group.relationType}-${relation.targetWork.id}`}>
                  <Link
                    href={`/works/${relation.targetWork.id}`}
                    className="border-border bg-background hover:border-primary flex items-center gap-3 rounded-lg border p-2 transition-colors"
                  >
                    {relation.targetWork.coverImageUrl ? (
                      // AniList の画像を直接 hotlink する方針(next.config の画像最適化設定は
                      // 対象外)のため、next/image ではなく通常の img 要素を使う。
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={relation.targetWork.coverImageUrl}
                        alt=""
                        className="h-16 w-12 flex-none rounded object-cover"
                      />
                    ) : (
                      <div className="bg-muted h-16 w-12 flex-none rounded" aria-hidden />
                    )}
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="text-foreground truncate text-sm font-medium">
                        {pickDisplayTitle(relation.targetWork)}
                      </span>
                      <Badge
                        variant={relation.targetWork.type === 'ANIME' ? 'primary' : 'secondary'}
                      >
                        {ja.works.detail.typeLabels[relation.targetWork.type]}
                      </Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
