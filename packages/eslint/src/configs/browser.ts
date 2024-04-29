import { TSESLint } from '@typescript-eslint/utils';

export const config: TSESLint.Linter.Config = {
  extends: ['plugin:jshow/typescript'],
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    }
  },
  env: {
    browser: true
  },
  rules: {
    //#region eslint

    'no-alert': 'error',
    'jsx-a11y/anchor-is-valid': 'off'

    //#endregion
  }
};
