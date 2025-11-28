import { name, version } from '../package.json';

import { rules } from './rules';

/**
 * 所有自定义规则都会通过此入口暴露给 ESLint。
 * meta 信息会被 IDE/CLI 用于展示插件及版本号。
 */
export default {
  meta: { name, version },
  rules
};
