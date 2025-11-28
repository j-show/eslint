import { Linter } from 'eslint';
import globals from 'globals';

import typescriptConfigs from './typescript';
import { buildCompat } from './utils';

const legacyConfigs: Linter.Config[] = buildCompat(...typescriptConfigs, {
  languageOptions: {
    parserOptions: {
      jsx: true
    },

    globals: globals.browser
  },

  rules: {
    //#region eslint

    'no-alert': 'error'

    //#endregion
  }
});

export default legacyConfigs;
