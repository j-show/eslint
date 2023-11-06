import { AST_NODE_TYPES, AST_TOKEN_TYPES } from '@typescript-eslint/types';
import { ESLintUtils, TSESLint, TSESTree } from '@typescript-eslint/utils';

import { ReportIssueFunc } from './types';
import { getContextReportIssue } from './utils';

export interface UnusedVariableOption {
  autoFix?: 'off' | 'always';
  ignoredNames?: string[];
}

export type UnusedVariableMessageIds =
  | 'unusedSingleVariable'
  | 'unusedAllVariable';

type ReportIssue = ReportIssueFunc<UnusedVariableMessageIds>;

interface ReportOptions {
  autoFix: boolean;
  ignoredNames: string[];
}

const create: ESLintUtils.RuleCreateAndOptions<
  [UnusedVariableOption],
  UnusedVariableMessageIds,
  TSESLint.RuleListener
>['create'] = (context, defaultOptions) => {
  const options = context.options || [];
  const option = options[0] || defaultOptions[0] || {};

  const realOption: ReportOptions = {
    autoFix: (option.autoFix || 'always') === 'always',
    ignoredNames: option.ignoredNames || ['_']
  };

  const reportIssue = getContextReportIssue(context);
  const sourceCode = context.getSourceCode();

  return {
    VariableDeclaration: node => {
      const parent = node.parent;
      if (
        parent?.type === AST_NODE_TYPES.ExportNamedDeclaration ||
        parent?.type === AST_NODE_TYPES.ExportDefaultDeclaration
      ) {
        return;
      }

      const variables = context.getDeclaredVariables(node);
      const unusedVars = variables.filter(
        variable =>
          variable.references.length <= 1 &&
          !realOption.ignoredNames.includes(variable.name)
      );

      if (unusedVars.length < 1) return;

      if (unusedVars.length === variables.length) {
        const isNormalOrNonFunctionDeclaration =
          node.declarations.every(isNotFuncExpression);

        if (isNormalOrNonFunctionDeclaration) {
          reportIssue(
            unusedVars.length > 1
              ? 'unusedAllVariable'
              : 'unusedSingleVariable',
            node,
            realOption.autoFix ? o => o.remove(node) : null,
            { data: { names: variables.map(o => o.name).join(', ') } }
          );
          return;
        }
      }

      const removedIndex = new Set<number>();

      for (const variable of unusedVars) {
        const name = variable.name;
        const node = variable.identifiers[0];

        reportIssue(
          'unusedSingleVariable',
          node,
          fixVariableDeclarator(sourceCode, realOption, node, removedIndex),
          {
            data: { names: name }
          }
        );
      }
    }
  };
};

const FUNC_EXPRESSION_TYPES = [
  AST_NODE_TYPES.FunctionExpression,
  AST_NODE_TYPES.ArrowFunctionExpression,
  AST_NODE_TYPES.CallExpression,
  AST_NODE_TYPES.AwaitExpression
];

const isNotFuncExpression = (
  node?: TSESTree.Node
): node is TSESTree.VariableDeclarator => {
  if (node?.type !== AST_NODE_TYPES.VariableDeclarator) return false;

  const initType = node.init?.type;
  if (!initType) return true;

  return !FUNC_EXPRESSION_TYPES.includes(initType);
};

const isPunctuatorComma = (
  node?: unknown
): node is TSESTree.PunctuatorToken => {
  const token = node as TSESTree.Token | undefined;
  return token?.type === AST_TOKEN_TYPES.Punctuator && token.value === ',';
};

type NumberRange = [number, number];

const formatRange = (
  range: NumberRange,
  removedIndex: Set<number>
): NumberRange => {
  const result: NumberRange = [range[0], range[1]];

  for (let i = range[0]; i <= range[1]; i++) {
    if (removedIndex.has(i)) continue;
    result[0] = i;
    break;
  }

  for (let i = range[1]; i >= result[0]; i--) {
    if (removedIndex.has(i)) continue;
    result[1] = i;
    break;
  }

  for (let i = result[0]; i <= result[1]; i++) removedIndex.add(i);

  return result;
};

const removePunctuatorRange = (
  o: TSESLint.RuleFixer,
  code: TSESLint.SourceCode,
  node: TSESTree.Node,
  removedIndex: Set<number>
) => {
  const prevToken = code.getTokenBefore(node);
  const nextToken = code.getTokenAfter(node);
  const isFirst = !prevToken || prevToken.type !== AST_TOKEN_TYPES.Identifier;
  const isLast = !nextToken || nextToken.type !== AST_TOKEN_TYPES.Identifier;

  let range: NumberRange | null = [node.range[0], node.range[1]];

  if (isPunctuatorComma(nextToken)) {
    range[1] = nextToken.range[1];
  } else if (isLast && isPunctuatorComma(prevToken)) {
    range[0] = prevToken.range[0];
  } else {
    return o.remove(node);
  }

  range = formatRange(range, removedIndex);

  return o.removeRange(range);
};

const fixVariableDeclarator = (
  code: TSESLint.SourceCode,
  realOption: ReportOptions,
  node: TSESTree.Node,
  removedIndex: Set<number>
): TSESLint.ReportFixFunction | null => {
  if (!realOption.autoFix) return null;

  return o => {
    const parent = node.parent;
    if (isNotFuncExpression(parent)) {
      return removePunctuatorRange(o, code, parent, removedIndex);
    }

    return removePunctuatorRange(o, code, node, removedIndex);
  };
};

const SchemaOverrideProperties = {
  autoFix: { enum: ['off', 'always'] },
  ignoredNames: {
    type: 'array',
    items: {
      type: 'string'
    }
  }
};

const name = 'unused-variable' as const;

/**
 * 这是一个 eslint 插件规则。
 * 能够收缩代码中未被使用的 import，并自动删除。
 */
const rule = ESLintUtils.RuleCreator(
  ruleName => `https://typescript-eslint.io/rules/${ruleName}/`
)({
  name,
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      recommended: false,
      description: 'disallow unused imports'
    },
    messages: {
      unusedSingleVariable: 'Unused variable detected: {{names}}',
      unusedAllVariable: 'All Variables is unused: {{names}}'
    },
    schema: [
      {
        type: 'object',
        properties: {
          ...SchemaOverrideProperties
        },
        additionalProperties: false
      }
    ]
  },
  defaultOptions: [
    {
      autoFix: 'always',
      ignoredNames: ['_']
    }
  ],
  create
});

export default { name, rule };
