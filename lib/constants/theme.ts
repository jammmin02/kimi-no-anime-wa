// ダーク/ライトモードの選択状態を保存する localStorage キー。
// app/layout.tsx の初期化スクリプトと components/ui/ThemeToggle.tsx の両方から参照する。
export const THEME_STORAGE_KEY = 'kimi-no-anime-wa:theme';

export type Theme = 'light' | 'dark';
