import { type Linter } from 'eslint';

import eslintPluginPrettier from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

import prettier from 'prettier';

import { buildCompat } from './utils';

/**
 * 解析指定工作目录下的 Prettier 配置。
 *
 * 在 ESLint 侧与 CLI 使用同一套 `.prettierrc` 等配置，避免「能过 lint 却不能过 format」的分裂。
 *
 * @param cwd - 作为 `prettier.resolveConfig` 起点的目录，一般为 `process.cwd()` 或 `eslint.config.js` 所在目录
 * @param defaultConfig - 当未找到配置文件时回落的对象
 * @returns 合并后的 Prettier 选项对象
 */
const resolveConfig = async (
  cwd: string,
  defaultConfig: object = {}
): Promise<object> => {
  const rc = await prettier.resolveConfig(cwd);
  return rc || defaultConfig;
};

/**
 * 生成「关闭与 Prettier 冲突的规则 + 以 Prettier 结果为错误」的 Flat 配置片段。
 *
 * 必须异步：需先读取磁盘上的 Prettier 配置才能把 `prettier/prettier` 规则参数填实。
 *
 * @param cwd - 解析 Prettier 配置时的工作目录
 * @param defaultConfig - 无 rc 文件时的默认 Prettier 选项
 * @returns 可展开进 `eslint.config.js` 的 `Linter.Config[]`
 *
 * @example
 * ```js
 * import prettierPreset from 'eslint-config-jshow/prettier';
 *
 * const prettierConfigs = await prettierPreset(process.cwd());
 * export default [...other, ...prettierConfigs];
 * ```
 */
const legacyConfigsFn = async (
  cwd: string,
  defaultConfig: object = {}
): Promise<Linter.Config[]> => {
  const prettierrc = await resolveConfig(cwd, defaultConfig);

  return buildCompat(eslintConfigPrettier, {
    plugins: {
      prettier: eslintPluginPrettier
    },
    rules: {
      'prettier/prettier': ['error', prettierrc]
    }
  });
};

export default legacyConfigsFn;
