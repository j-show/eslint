import { name, version } from '../package.json';

import { rules } from './rules';

/**
 * ESLint 插件主入口
 *
 * 所有自定义规则都会通过此入口暴露给 ESLint。
 * meta 信息会被 IDE/CLI 用于展示插件及版本号。
 *
 * @example
 * ```js
 * import jshowPlugin from 'eslint-plugin-jshow';
 *
 * export default [
 *   {
 *     plugins: {
 *       jshow: jshowPlugin
 *     },
 *     rules: {
 *       'jshow/explicit-member-accessibility': 'error'
 *     }
 *   }
 * ];
 * ```
 */
export default {
  meta: { name, version },
  rules
};
