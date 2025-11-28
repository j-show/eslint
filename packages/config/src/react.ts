import { ESLint, Linter } from 'eslint';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';

import browserConfigs from './browser';
import { buildCompat } from './utils';

const reactConfigs = pluginReact.configs.flat as unknown as Record<
  string,
  Linter.Config
>;

const legacyConfigs: Linter.Config[] = buildCompat(
  ...browserConfigs,
  reactConfigs['recommended'],
  reactConfigs['jsx-runtime'],
  {
    plugins: {
      react: pluginReact,
      'react-hooks': pluginReactHooks as unknown as ESLint.Plugin
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    }
  },
  {
    files: ['**/*.jsx', '**/*.tsx'],
    rules: {
      'jshow/sort-import': [
        'error',
        {
          groups: [
            ['^node:'],
            ['\\u0000'],
            ['^react', '^@?[a-zA-Z]'],
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
      'react/react-in-jsx-scope': 'off'
    }
  }
);

export default legacyConfigs;
