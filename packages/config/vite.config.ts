import path from 'node:path';

import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

import pkg from './package.json';

const resolve = (p: string) => path.resolve(__dirname, p);

const inputs = {
  index: resolve('src/index.ts'),
  browser: resolve('src/browser.ts'),
  node: resolve('src/node.ts'),
  react: resolve('src/react.ts'),
  typescript: resolve('src/typescript.ts'),
  vue: resolve('src/vue.ts')
};

const externals = new Set<string>([
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {})
]);

export default defineConfig({
  plugins: [
    dts({
      entryRoot: resolve('src'),
      tsconfigPath: resolve('tsconfig.json'),
      outDir: resolve('dist'),
      logLevel: 'error'
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
    rollupOptions: {
      external: Array.from(externals),
      input: inputs,
      output: [
        {
          format: 'cjs',
          exports: 'default',
          entryFileNames: '[name].cjs',
          chunkFileNames: 'chunks/[hash].cjs',
          interop: 'auto',
          inlineDynamicImports: false
        },
        {
          format: 'es',
          exports: 'default',
          entryFileNames: '[name].es.js',
          chunkFileNames: 'chunks/[hash].es.js',
          interop: 'auto',
          inlineDynamicImports: false
        }
      ]
    }
  }
});
