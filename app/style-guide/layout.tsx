import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// 開発用ページのため検索エンジンにはインデックスさせない。
// (page.tsx は 'use client' のためここで metadata を分離している)
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function StyleGuideLayout({ children }: { children: ReactNode }) {
  return children;
}
