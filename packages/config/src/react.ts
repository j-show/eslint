import { TSESLint } from '@typescript-eslint/utils';

const config: TSESLint.Linter.Config = {
  extends: ['jshow/browser', 'plugin:react/recommended'],
  plugins: ['react', 'react-hooks'],
  settings: {
    react: {
      version: 'detect'
    }
  },
  overrides: [
    {
      files: ['*.jsx', '*.tsx'],
      rules: {
        'simple-import-sort/imports': [
          'error',
          {
            groups: [
              ['\\u0000'],
              ['react', '^@?[a-zA-Z]'],
              ['^@/'],
              ['^\\.\\./'],
              ['^\\./']
            ]
          }
        ],

        'react/display-name': 'off',
        'react/prop-types': 'off',
        'react/jsx-key': 'error',
        'react/jsx-filename-extension': [
          'warn',
          { extensions: ['.jsx', '.tsx'] }
        ],
        'react/jsx-no-target-blank': ['warn'],
        'react/no-find-dom-node': 'off',
        'react/no-unescaped-entities': 'off',
        'react/no-unknown-property': 'off',
        'react/react-in-jsx-scope': 'off',
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn'
      }
    }
  ]
};

export = config;
