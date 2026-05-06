import path from 'node:path';

import { configDefaults, defineConfig } from 'vitest/config';

/**
 * @param p - 相对包根的路径
 * @returns 绝对路径
 */
const resolveFromRoot = (p: string) => path.resolve(__dirname, p);

/**
 * 规则包单元测试配置：仅收集 `test` 目录下 `*.test.ts` / `*.spec.ts`，Node 环境 + 较长超时以适配 RuleTester。
 */
export default defineConfig({
  test: {
    include: ['test/**/*.{test,spec}.ts'],
    exclude: [...configDefaults.exclude, 'dist/**'],
    globals: true,
    environment: 'node',
    testTimeout: 60_000,
    coverage: {
      enabled: false,
      provider: 'v8',
      reportsDirectory: resolveFromRoot('test/coverage')
    }
  }
});
