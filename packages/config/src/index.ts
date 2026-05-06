import { type Linter } from 'eslint';

import globals from 'globals';

import browser from './browser';
import node from './node';
import prettier from './prettier';
import react from './react';
import typescript from './typescript';
import vue from './vue';

/**
 * 预设导出名，与 `config` 对象上的键一一对应。
 *
 * 用于在类型层面约束可组合的预设键，避免拼写错误。
 */
type ConfigKey = 'typescript' | 'browser' | 'node' | 'react' | 'vue';

/**
 * ESLint 配置集合
 *
 * 包含所有可用的 ESLint 配置预设，每个预设针对不同的运行时环境：
 * - `typescript`: TypeScript 通用配置（基础配置）
 * - `browser`: 浏览器环境配置（基于 typescript）
 * - `node`: Node.js 环境配置（基于 typescript）
 * - `react`: React 应用配置（基于 browser）
 * - `vue`: Vue 应用配置（基于 browser）
 *
 * @example
 * ```js
 * import config from 'eslint-config-jshow';
 *
 * export default [
 *   ...config.typescript,
 *   ...config.react
 * ];
 * ```
 */
const config: Record<ConfigKey, Linter.Config[]> & {
  prettier: typeof prettier;
  globals: typeof globals;
} = {
  typescript,
  browser,
  node,
  react,
  vue,
  prettier,
  globals
};

export default config;
