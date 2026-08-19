import type { Metadata } from 'next';
import { Noto_Sans_JP, Noto_Sans_KR } from 'next/font/google';

import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { THEME_STORAGE_KEY } from '@/lib/constants/theme';
import { getCurrentUser } from '@/server/auth/session';

import './globals.css';

// 優先市場は日本語ユーザーのため Noto Sans JP を優先読み込み(preload あり)し、
// 韓国語表示にも自然に対応できるよう Noto Sans KR も併用する(preload なしで
// 遅延読み込みにし、初期表示のペイロードを抑える)。可変フォント(weight: 'variable')
// を使うことでウェイトごとの複数ファイル読み込みを避けている。
// CSS 変数として注入し、実際の font-family の組み立ては app/theme.css の
// `--font-sans` で行う(値の一元管理は theme.css 側に置く方針のため)。
const notoSansJP = Noto_Sans_JP({
  weight: 'variable',
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-noto-sans-jp',
});

const notoSansKR = Noto_Sans_KR({
  weight: 'variable',
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  variable: '--font-noto-sans-kr',
});

// アプリ全体の既定メタ情報。優先市場が日本語ユーザーのため、タイトル・説明文は日本語で記述する。
export const metadata: Metadata = {
  title: '君のアニメは',
  description:
    '日本・韓国のアニメ/マンガ情報を統合し、自サービスのレビュー・評価データをもとに AI がおすすめ作品を提案する個人プロジェクト。',
};

// ライト/ダークモードの初期化スクリプト。
// 「ライトモード優先 + ダークモードは選択式サポート」の方針のため、OS の
// prefers-color-scheme には従わず、localStorage に保存された明示的な選択が
// あるときだけ <html> に "dark" クラスを付ける。ハイドレーション前に同期的に
// 実行することで、ダークモード選択済みユーザーでの一瞬だけライト表示になる
// ちらつき(FOUC)を防ぐ。
const THEME_INIT_SCRIPT = `
(function () {
  try {
    if (localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}) === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

// TODO(P1-7): i18n 導入時にユーザーの言語設定に応じて lang 属性を切り替える。
// 優先市場が日本語ユーザーのため、既定値は "ja" とする。
export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const user = await getCurrentUser();

  return (
    <html
      lang="ja"
      className={`${notoSansJP.variable} ${notoSansKR.variable} h-full antialiased`}
      // 上の初期化スクリプトがハイドレーション前に "dark" クラスを付け足すため、
      // サーバー側の描画結果と食い違うのは意図した挙動。React にそれを警告として
      // 出させない(next-themes 等でも使われる標準的な対処法)。
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <Navbar user={user} />
        <main className="flex flex-1 flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
