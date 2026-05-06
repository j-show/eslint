/**
 * 仓库根 ESLint Flat 配置：Node 预设 + 异步 Prettier 对齐片段 + 本仓库专用的 `jshow/sort-import` 分组。
 *
 * `prettier` 为异步工厂，需顶层 `await` 以读取项目 Prettier 配置后再注入 `prettier/prettier` 规则。
 *
 * @module eslint.config
 */
import jshowConfig from 'eslint-config-jshow';

const prettierConfigs = await jshowConfig.prettier(process.cwd());

export default [
  ...jshowConfig.node,
  ...prettierConfigs,
  {
    ignores: ['dist', 'node_modules', 'build', 'examples']
  }
];
