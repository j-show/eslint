import { type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import { type ESLint } from 'eslint';

/**
 * ESLint 规则定义类型
 *
 * 统一抽象每条规则的类型，方便在 import/export 时具备完整的 meta 声明。
 * 该类型确保所有规则都符合 ESLint 插件的标准接口。
 */
export type RuleDefinition =
  Required<ESLint.Plugin>['rules'][keyof ESLint.Plugin['rules']];

/**
 * 报告问题时的数据上下文
 *
 * 需要展示在 message 模板中的通用字段，例如规则针对的实体名称。
 * 所有规则在报告问题时都应包含此基础数据结构。
 *
 * @example
 * ```ts
 * const data: ReportIssueData = {
 *   name: 'MyClass',
 *   type: 'class property'
 * };
 * ```
 */
export interface ReportIssueData extends Record<string, unknown> {
  /** 实体名称，如变量名、类名、函数名等 */
  name: string;
}

/**
 * 报告问题的函数类型
 *
 * 包装后的 context.report，约定 messageId/node/fix 的调用顺序，减少重复代码。
 * 该类型统一了所有规则中报告问题的接口。
 *
 * @template ID - 消息 ID 类型，用于类型安全的消息标识
 *
 * @param messageId - 消息 ID，对应规则 meta.messages 中定义的键
 * @param node - 触发问题的 AST 节点
 * @param fix - 自动修复函数，为 null 时表示不提供自动修复
 * @param descriptor - 额外的报告描述符，可包含 data 等字段
 *
 * @example
 * ```ts
 * const reportIssue: ReportIssueFunc<'missingAccessibility'> = (
 *   messageId,
 *   node,
 *   fix,
 *   { data }
 * ) => {
 *   context.report({ node, messageId, fix, data });
 * };
 * ```
 */
export type ReportIssueFunc<ID extends string> = (
  messageId: ID,
  node: TSESTree.Node,
  fix: TSESLint.ReportFixFunction | null,
  descriptor?: Omit<TSESLint.ReportDescriptor<ID>, 'node' | 'messageId' | 'fix'>
) => void;
