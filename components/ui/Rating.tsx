'use client';

import { Star } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

export interface RatingProps {
  /** 0 〜 max の評価値。小数(例: 3.7)も指定可能で、星の塗りを割合で表現する。 */
  value: number;
  /** 星の数。既定は 5(DB 上の 1〜10 評価は呼び出し側で /2 して渡すことを想定)。 */
  max?: number;
  size?: number;
  /** 指定すると読み取り専用ではなくクリックで評価を入力できるようになる(レビュー投稿画面用)。 */
  onChange?: (value: number) => void;
  className?: string;
  'aria-label'?: string;
}

// 星評価コンポーネント。表示専用(平均評価バッジなど)と、onChange を渡した場合の
// 入力用(レビュー投稿フォームなど)の両方に対応する。
export function Rating({
  value,
  max = 5,
  size = 18,
  onChange,
  className,
  'aria-label': ariaLabel,
}: RatingProps) {
  const isInteractive = typeof onChange === 'function';
  const stars = Array.from({ length: max }, (_, i) => i + 1);

  return (
    <div
      className={cn('inline-flex items-center gap-0.5', className)}
      role={isInteractive ? 'radiogroup' : 'img'}
      aria-label={ariaLabel ?? `${max} 段階中 ${value} 評価`}
    >
      {stars.map((starIndex) => {
        // 星 1 個あたりの塗り割合(0〜1)。3.7/5 なら 4 個目の星は 0.7 だけ塗る。
        const fillRatio = Math.max(0, Math.min(1, value - (starIndex - 1)));

        const star = (
          <span
            key={starIndex}
            className="relative inline-block"
            style={{ width: size, height: size }}
          >
            <Star size={size} className="text-muted-foreground absolute inset-0" />
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fillRatio * 100}%` }}
            >
              <Star size={size} className="fill-accent text-accent" />
            </span>
          </span>
        );

        if (!isInteractive) {
          return star;
        }

        return (
          <button
            key={starIndex}
            type="button"
            role="radio"
            aria-checked={value === starIndex}
            aria-label={`${starIndex} 点`}
            onClick={() => onChange(starIndex)}
            className="focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
          >
            {star}
          </button>
        );
      })}
    </div>
  );
}
