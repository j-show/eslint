import path from 'node:path';

import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

import pkg from './package.json';

/**
 * @param p - 相对 `__dirname` 的路径
 * @returns 绝对路径
 */
const resolve = (p: string) => path.resolve(__dirname, p);

/**
 * 外部化依赖集合，避免把 ESLint/typescript-eslint 等运行时 peer 打进插件包。
 */
const externals = new Set<string>([
  ...Object.keys(pkg.peerDependencies ?? {}),
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {})
]);

/**
 * `eslint-plugin-jshow` 单入口构建：CJS/ESM 双格式 + dts。
 */
export default defineConfig({
  plugins: [
    dts({
      entryRoot: resolve('src'),
      tsconfigPath: resolve('tsconfig.json')
    })
  ],
  build: {
    target: 'esnext',
    emptyOutDir: true,
    sourcemap: false,
    minify: true,
    lib: {
      entry: resolve('src/index.ts'),
      formats: ['cjs', 'es'],
      fileName: format => `index.${format === 'es' ? 'mjs' : 'cjs'}`
    },
    rolldownOptions: {
      external: [/^node:/, ...Array.from(externals)]
    }
  }
});
