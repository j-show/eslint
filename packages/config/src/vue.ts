import typescriptParser from '@typescript-eslint/parser';
import { type Linter } from 'eslint';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import vueParser from 'vue-eslint-parser';

import browserConfigs from './browser';
import { buildCompat } from './utils';

const vueRecommendeds = pluginVue.configs[
  'flat/recommended'
] as unknown as Linter.Config[];

/**
 * Vue 应用 ESLint 配置
 *
 * 基于浏览器配置，添加了 Vue 3 的规则和解析器。
 * 适用于使用 Vue 3 框架的前端项目。
 *
 * 主要特性：
 * - 继承浏览器配置的所有规则
 * - 启用 Vue 推荐规则
 * - 使用 Vue ESLint Parser 解析 `.vue` 文件
 * - 启用 Vue 全局变量（如 `defineProps`、`defineEmits` 等）
 * - 针对 Vue 优化的导入排序（Vue 相关导入优先）
 * - 强制使用 `<script setup>` 或 Composition API
 * - 针对 `.vue` 文件的特定规则
 *
 * @example
 * ```js
 * import vueConfig from 'eslint-config-jshow/vue';
 *
 * export default [...vueConfig];
 * ```
 */
const legacyConfigs: Linter.Config[] = buildCompat(
  ...browserConfigs,
  ...vueRecommendeds,
  {
    files: ['**/*.vue'],
    plugins: { vue: pluginVue },
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: typescriptParser,
        extraFileExtensions: ['.vue']
      },

      globals: globals.vue
    },
    rules: {
      'no-undef': 'off',

      '@typescript-eslint/no-unused-vars': 'off',

      'jshow/sort-import': [
        'error',
        {
          groups: [
            ['^node:'],
            ['\\u0000'],
            ['^vue', '^@?[a-zA-Z]'],
            ['^@/'],
            ['^\\.\\./'],
            ['^\\./']
          ]
        }
      ],

      'vue/component-api-style': ['error', ['script-setup', 'composition']],
      'vue/multi-word-component-names': ['warn'],
      'vue/no-dupe-keys': 'off',
      'vue/no-unused-components': ['off', { ignoreWhenBindingPresent: true }],
      'vue/v-on-event-hyphenation': 'off'
    }
  }
);

export default legacyConfigs;
