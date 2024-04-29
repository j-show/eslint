import { TSESLint, TSESTree } from '@typescript-eslint/utils';

export interface ReportIssueData extends Record<string, unknown> {
  name: string;
}

export type ReportIssueFunc<ID extends string> = (
  messageId: ID,
  node: TSESTree.Node,
  fix: TSESLint.ReportFixFunction | null,
  descriptor?: Omit<TSESLint.ReportDescriptor<ID>, 'node' | 'messageId' | 'fix'>
) => void;
