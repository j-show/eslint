import { rules as TSESLintRules } from '@typescript-eslint/eslint-plugin';
import { AST_NODE_TYPES } from '@typescript-eslint/types';
import { TSESLint, TSESTree } from '@typescript-eslint/utils';

import { ReportIssueFunc } from './types';

enum MemberNameType {
  Private = 1,
  Quoted = 2,
  Normal = 3,
  Expression = 4
}

export const getNameFromMember = (
  member:
    | TSESTree.MethodDefinition
    | TSESTree.TSMethodSignature
    | TSESTree.TSAbstractMethodDefinition
    | TSESTree.PropertyDefinition
    | TSESTree.TSAbstractPropertyDefinition
    | TSESTree.Property
    | TSESTree.TSPropertySignature,
  sourceCode: TSESLint.SourceCode
): { type: MemberNameType; name: string } => {
  if (member.key.type === AST_NODE_TYPES.Identifier) {
    return {
      type: MemberNameType.Normal,
      name: member.key.name
    };
  }
  if (member.key.type === AST_NODE_TYPES.PrivateIdentifier) {
    return {
      type: MemberNameType.Private,
      name: `#${member.key.name}`
    };
  }
  if (member.key.type === AST_NODE_TYPES.Literal) {
    const name = `${member.key.value}`;
    // if (requiresQuoting(name)) {
    if (name.includes("'")) {
      return {
        type: MemberNameType.Quoted,
        name: `"${name}"`
      };
    } else {
      return {
        type: MemberNameType.Normal,
        name
      };
    }
  }

  return {
    type: MemberNameType.Expression,
    name: sourceCode.text.slice(...member.key.range)
  };
};

export const getContextReportIssue = <
  ID extends string,
  OPT extends readonly unknown[] = []
>(
  context: TSESLint.RuleContext<ID, OPT>
) => {
  const reportIssue: ReportIssueFunc<ID> = (
    messageId,
    node,
    fix,
    descriptor
  ) => {
    context.report({
      node,
      messageId,
      fix,
      ...descriptor
    });
  };

  return reportIssue;
};

export const getRuleListener = <
  ID extends string,
  OPT extends readonly unknown[]
>(
  name: string,
  context: TSESLint.RuleContext<ID, OPT>
) => {
  let ruleModule: TSESLint.RuleModule<ID, OPT>;

  try {
    ruleModule = TSESLintRules[name] as unknown as TSESLint.RuleModule<ID, OPT>;
  } catch {
    ruleModule = new TSESLint.Linter()
      .getRules()
      .get(name) as unknown as TSESLint.RuleModule<ID, OPT>;
  }

  return ruleModule?.create(context) ?? {};
};
