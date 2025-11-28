import path from 'node:path';

import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

import pkg from './package.json';

const resolve = (p: string) => path.resolve(__dirname, p);

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
    minify: false,
    lib: {
      entry: resolve('src/index.ts'),
      formats: ['cjs', 'es'],
      fileName: format => `index.${format === 'es' ? 'es.js' : format}`
    },
    rollupOptions: {
      external: Array.from(externals)
    }
  }
});
