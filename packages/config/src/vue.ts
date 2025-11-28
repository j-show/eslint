import typescriptParser from '@typescript-eslint/parser';
import { Linter } from 'eslint';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import vueParser from 'vue-eslint-parser';

import browserConfigs from './browser';
import { buildCompat } from './utils';

const vueRecommendeds = pluginVue.configs[
  'flat/recommended'
] as unknown as Linter.Config[];

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

      'vue/v-on-event-hyphenation': 'off',
      'vue/multi-word-component-names': ['warn'],
      'vue/component-api-style': ['error', ['script-setup', 'composition']],
      'vue/no-unused-components': ['off', { ignoreWhenBindingPresent: true }]
    }
  }
);

export default legacyConfigs;
