import { TSESLint } from '@typescript-eslint/utils';

const config: TSESLint.Linter.Config = {
  extends: [
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript'
  ],
  plugins: ['import'],
  rules: {
    'import/first': 'error',
    'import/newline-after-import': 'error',
    'import/no-duplicates': 'error',
    'import/no-unresolved': 'off',
    'import/no-named-as-default': 'off'
  }
};

export default config;
