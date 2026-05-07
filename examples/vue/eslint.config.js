/**
 * Vue 示例应用的 ESLint Flat 配置：Vue 预设 + 异步 Prettier 片段 + 常见产物目录忽略。
 *
 * @module eslint.config
 */
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import prettierConfig from 'eslint-config-jshow/prettier';
import jshowConfig from 'eslint-config-jshow/vue';

const prettierConfigs = await prettierConfig(
  dirname(fileURLToPath(import.meta.url))
);

export default [
  ...jshowConfig,
  ...prettierConfigs,
  {
    ignores: [
      'dist',
      'node_modules',
      'build',
      'coverage',
      'public',
      'static',
      'test'
    ]
  }
];
