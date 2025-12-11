import { type Linter } from 'eslint';

/**
 * 构建兼容的配置数组
 *
 * 将多个 ESLint 配置（可能是单个配置或配置数组）展平为一个配置数组。
 * 用于在 Flat Config 模式下合并多个配置预设。
 *
 * @param configs - 要合并的配置列表，可以是单个配置对象或配置数组
 * @returns 展平后的配置数组
 *
 * @example
 * ```ts
 * const configs = buildCompat(
 *   baseConfig,
 *   [reactConfig, vueConfig],
 *   customConfig
 * );
 * // 返回: [baseConfig, reactConfig, vueConfig, customConfig]
 * ```
 */
export const buildCompat = (
  ...configs: Array<Linter.Config | Linter.Config[]>
): Linter.Config[] => configs.flat();
