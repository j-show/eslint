import path from 'node:path';

import { configDefaults, defineConfig } from 'vitest/config';

const resolveFromRoot = (p: string) => path.resolve(__dirname, p);

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


