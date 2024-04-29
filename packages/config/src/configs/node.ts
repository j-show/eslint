import { TSESLint } from '@typescript-eslint/utils';

const config: TSESLint.Linter.Config = {
  extends: ['plugin:jshow/typescript'],
  env: {
    node: true,
    mongo: true
  },
  rules: {
    //#region eslint

    'no-new-require': 'warn',
    'no-path-concat': 'error',
    'no-process-env': 'off',
    'no-process-exit': 'off',
    'no-sync': 'off',
    'no-restricted-globals': ['error', 'module', 'require'],

    //#endregion

    //#region @typescript-eslint

    '@typescript-eslint/no-var-requires': 'off'

    //#endregion
  }
};

export default config;
