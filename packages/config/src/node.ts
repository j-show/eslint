import { Linter } from 'eslint';
import globals from 'globals';

import typescriptConfigs from './typescript';
import { buildCompat } from './utils';

const legacyConfigs: Linter.Config[] = buildCompat(...typescriptConfigs, {
  languageOptions: {
    globals: globals.node
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
});

export default legacyConfigs;
