import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Prettier と競合するスタイル系ルールを無効化する。
  // 必ず nextVitals / nextTs より後ろに置くこと(後勝ちで上書きされるため)。
  prettierConfig,
  // eslint-config-next のデフォルト無視設定を上書きする。
  globalIgnores([
    // eslint-config-next のデフォルト無視対象:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
