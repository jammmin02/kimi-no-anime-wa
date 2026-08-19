// 全画面共通のフッター。今のところ最小限の情報のみ表示する。
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-border border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-8 text-center sm:px-6">
        <p className="text-foreground text-sm font-semibold">君のアニメは</p>
        <p className="text-muted-foreground max-w-md text-xs leading-relaxed">
          作品データは AniList を通じて取得・キャッシュしています。ランキング・レビュー・
          おすすめは自サービス独自のデータのみを基準に算出しています。
        </p>
        <p className="text-muted-foreground text-xs">
          © {year} 君のアニメは(非商用個人プロジェクト)
        </p>
      </div>
    </footer>
  );
}
