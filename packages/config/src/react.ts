import type { ESLint, Linter } from 'eslint';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';

import browserConfigs from './browser';
import { buildCompat } from './utils';

const reactConfigs = pluginReact.configs.flat as unknown as Record<
  string,
  Linter.Config
>;

/**
 * React 应用 ESLint 配置
 *
 * 基于浏览器配置，添加了 React 和 React Hooks 的规则。
 * 适用于使用 React 框架的前端项目。
 *
 * 主要特性：
 * - 继承浏览器配置的所有规则
 * - 启用 React 推荐规则和 JSX Runtime 规则
 * - 启用 React Hooks 规则（rules-of-hooks、exhaustive-deps）
 * - 针对 React 优化的导入排序（React 相关导入优先）
 * - 自动检测 React 版本
 * - 针对 `.jsx` 和 `.tsx` 文件的特定规则
 *
 * @example
 * ```js
 * import reactConfig from 'eslint-config-jshow/react';
 *
 * export default [...reactConfig];
 * ```
 */
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
