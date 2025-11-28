import { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { ESLint } from 'eslint';

/**
 * 统一抽象每条规则的类型，方便在 import/export 时具备完整的 meta 声明。
 */
export type RuleDefinition =
  Required<ESLint.Plugin>['rules'][keyof ESLint.Plugin['rules']];

/**
 * 需要展示在 message 模板中的通用字段，例如规则针对的实体名称。
 */
export interface ReportIssueData extends Record<string, unknown> {
  name: string;
}

/**
 * 包装后的 context.report，约定 messageId/node/fix 的调用顺序，减少重复代码。
 */
export type ReportIssueFunc<ID extends string> = (
  messageId: ID,
  node: TSESTree.Node,
  fix: TSESLint.ReportFixFunction | null,
  descriptor?: Omit<TSESLint.ReportDescriptor<ID>, 'node' | 'messageId' | 'fix'>
) => void;
