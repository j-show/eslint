import { TSESLint } from '@typescript-eslint/utils';

export const vue: TSESLint.Linter.Config = {
  extends: ['plugin:vue/vue3-recommended'],
  plugins: ['vue'],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    sourceType: 'module',
    ecmaVersion: 2020,
  },
  env: {
    browser: true,
  },
  overrides: [
    {
      files: ['*.vue'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',

        'simple-import-sort/imports': [
          'error',
          {
            groups: [['\\u0000'], ['vue', '^@?[a-zA-Z]'], ['^@/'], ['^\\.\\./'], ['^\\./']],
          },
        ],

        'vue/v-on-event-hyphenation': 'off',
        'vue/multi-word-component-names': ['warn'],
        'vue/component-api-style': ['error', ['script-setup', 'composition']],
        'vue/no-unused-components': ['off', { ignoreWhenBindingPresent: true }],
      },
    },
  ],
  globals: {
    defineProps: true,
    defineEmits: true,
    defineExpose: true,
    withDefaults: true,
  },
};
