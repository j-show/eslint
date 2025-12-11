import { type Linter } from 'eslint';
import globals from 'globals';

import typescriptConfigs from './typescript';
import { buildCompat } from './utils';

/**
 * Node.js 环境 ESLint 配置
 *
 * 基于 TypeScript 配置，添加了 Node.js 特定的全局变量和规则。
 * 适用于 Node.js 后端项目。
 *
 * 主要特性：
 * - 继承 TypeScript 基础配置的所有规则
 * - 启用 Node.js 全局变量（如 `process`、`Buffer`、`__dirname` 等）
 * - 允许使用 `require`（关闭 `@typescript-eslint/no-var-requires`）
 * - 添加 Node.js 特定规则（如禁止路径拼接、限制全局变量等）
 *
 * @example
 * ```js
 * import nodeConfig from 'eslint-config-jshow/node';
 *
 * export default [...nodeConfig];
 * ```
 */
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
