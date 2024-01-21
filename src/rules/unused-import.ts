import { AST_NODE_TYPES } from '@typescript-eslint/types';
import { ESLintUtils, TSESLint, TSESTree } from '@typescript-eslint/utils';

import { ReportIssueFunc } from './types';
import { getContextReportIssue } from './utils';

export interface UnusedImportOption {
  autoFix?: 'off' | 'always';
  ignoredNames?: string[];
}

export type UnusedImportMessageIds = 'unusedSingleImport' | 'unusedAllImport';

type ReportIssue = ReportIssueFunc<UnusedImportMessageIds>;

interface ReportOptions {
  autoFix: boolean;
  ignoredNames: string[];
}

const create: ESLintUtils.RuleCreateAndOptions<
  [UnusedImportOption],
  UnusedImportMessageIds,
  TSESLint.RuleListener
>['create'] = (context, defaultOptions) => {
  const options = context.options || [];
  const option = options[0] || defaultOptions[0] || {};

  const realOption: ReportOptions = {
    autoFix: (option.autoFix || 'always') === 'always',
    ignoredNames: option.ignoredNames || ['_']
  };

  const reportIssue = getContextReportIssue(context);

  return {
    ImportDeclaration: node =>
      checkUnusedImporter(context.getScope(), node, realOption, reportIssue)
  };
};

const fixFunc = (
  autoFix: boolean,
  value: TSESTree.Node | TSESTree.Token,
  last?: boolean
): TSESLint.ReportFixFunction | null => {
  if (!autoFix) return null;

  return o => {
    if (last == null) return o.remove(value);

    const s = last ? -1 : 0;
    const e = last ? 0 : 1;

    return o.removeRange([value.range[0] + s, value.range[1] + e]);
  };
};

const isUsed = (scope: TSESLint.Scope.Scope | null, name: string) => {
  const variable = scope?.variables.find(o => o.name === name);
  if (!variable) return false;

  return variable.references.length > 0;
};

const IMPORT_AST_TYPES = [
  AST_NODE_TYPES.ImportSpecifier,
  AST_NODE_TYPES.ImportDefaultSpecifier,
  AST_NODE_TYPES.ImportNamespaceSpecifier
];

function checkUnusedImporter(
  scope: TSESLint.Scope.Scope | null,
  node: TSESTree.ImportDeclaration,
  options: ReportOptions,
  reportIssue: ReportIssue
) {
  const { autoFix, ignoredNames } = options;

  const specifiers = node.specifiers;
  if (specifiers.length < 1) return;

  const unusedSpecifiers = specifiers.filter(specifier => {
    if (!IMPORT_AST_TYPES.includes(specifier.type)) return false;

    const name = specifier.local.name;
    return !ignoredNames.includes(name) && !isUsed(scope, name);
  });

  if (unusedSpecifiers.length < 1) return;

  if (unusedSpecifiers.length === specifiers.length) {
    reportIssue('unusedAllImport', node, fixFunc(autoFix, node), {
      data: { name: unusedSpecifiers.map(o => o.local.name).join(', ') }
    });
    return;
  }

  const lastSpecifier = specifiers.at(-1);

  for (const specifier of unusedSpecifiers) {
    reportIssue(
      'unusedSingleImport',
      specifier,
      fixFunc(autoFix, specifier, specifier === lastSpecifier),
      {
        data: { name: specifier.local.name }
      }
    );
  }
}

const SchemaOverrideProperties = {
  autoFix: { enum: ['off', 'always'] },
  ignoredNames: {
    type: 'array',
    items: {
      type: 'string'
    }
  }
};

const name = 'unused-import' as const;

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
      unusedSingleImport: 'Unused import detected: {{name}}',
      unusedAllImport: 'All imports is unused: {{name}}'
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
