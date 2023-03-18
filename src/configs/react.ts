import { TSESLint } from '@typescript-eslint/utils';

export const react: TSESLint.Linter.Config = {
  extends: ['plugin:react/recommended'],
  plugins: ['react', 'react-hooks'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    browser: true,
  },
  rules: {
    'jsx-a11y/anchor-is-valid': 'off',
  },
  overrides: [
    {
      files: ['*.jsx', '*.tsx'],
      rules: {
        'react/display-name': 'off',
        'react/prop-types': 'off',
        'react/jsx-key': 'error',
        'react/jsx-filename-extension': ['warn', { extensions: ['.jsx', '.tsx'] }],
        'react/jsx-no-target-blank': ['warn'],
        'react/no-find-dom-node': 'off',
        'react/no-unescaped-entities': 'off',
        'react/no-unknown-property': 'off',
        'react/react-in-jsx-scope': 'off',
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
      },
    },
  ],
};
