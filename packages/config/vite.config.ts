import path from 'node:path';

import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

import pkg from './package.json';

/**
 * 将相对路径解析为包根目录下的绝对路径，供多入口 `build.lib` 使用。
 *
 * @param p - 相对 `__dirname` 的路径片段
 * @returns 绝对路径
 */
const resolve = (p: string) => path.resolve(__dirname, p);

/**
 * 多入口映射：每个键对应发布子路径（如 `browser.mjs` / `browser.cjs`）。
 */
const inputs = {
  index: resolve('src/index.ts'),
  typescript: resolve('src/typescript.ts'),
  browser: resolve('src/browser.ts'),
  node: resolve('src/node.ts'),
  react: resolve('src/react.ts'),
  vue: resolve('src/vue.ts'),
  prettier: resolve('src/prettier.ts')
};

/**
 * 构建时不应打进 bundle 的依赖集合（peer、dependencies、devDependencies 并集）。
 *
 * 预设包以 Node 解析方式消费这些包，打进 bundle 会放大体积并易引发双实例问题。
 */
const externals = new Set<string>([
  ...Object.keys(pkg.peerDependencies ?? {}),
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {})
]);

/**
 * `eslint-config-jshow` 的 Vite library 构建配置：双格式输出 + `vite-plugin-dts` 生成类型声明。
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
      entry: inputs.index
    },
    rolldownOptions: {
      external: Array.from(externals),
      input: inputs,
      output: [
        {
          format: 'cjs',
          exports: 'default',
          entryFileNames: '[name].cjs',
          chunkFileNames: 'chunks/[hash].cjs',
          inlineDynamicImports: false
        },
        {
          format: 'es',
          exports: 'default',
          entryFileNames: '[name].mjs',
          chunkFileNames: 'chunks/[hash].mjs',
          inlineDynamicImports: false
        }
      ]
    }
  }
});
