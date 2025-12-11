import { type Linter } from 'eslint';
import globals from 'globals';

import typescriptConfigs from './typescript';
import { buildCompat } from './utils';

/**
 * 浏览器环境 ESLint 配置
 *
 * 基于 TypeScript 配置，添加了浏览器特定的全局变量和规则。
 * 适用于在浏览器中运行的 TypeScript/JavaScript 项目。
 *
 * 主要特性：
 * - 继承 TypeScript 基础配置的所有规则
 * - 启用浏览器全局变量（如 `window`、`document` 等）
 * - 启用 JSX 支持
 * - 添加浏览器特定规则（如禁止 `alert`）
 *
 * @example
 * ```js
 * import browserConfig from 'eslint-config-jshow/browser';
 *
 * export default [...browserConfig];
 * ```
 */
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
