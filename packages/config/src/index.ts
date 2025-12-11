import { type Linter } from 'eslint';

import browser from './browser';
import node from './node';
import react from './react';
import typescript from './typescript';
import vue from './vue';

/** 配置键类型，对应不同的运行时环境 */
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
const config: Record<ConfigKey, Linter.Config[]> = {
  typescript,
  browser,
  node,
  react,
  vue
};

export default config;
