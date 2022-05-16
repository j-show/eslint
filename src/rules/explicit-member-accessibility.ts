import { AST_NODE_TYPES, AST_TOKEN_TYPES } from '@typescript-eslint/types';
import { ESLintUtils, TSESLint, TSESTree } from '@typescript-eslint/utils';

import * as utils from './utils';

type StaticAccessibilityLevel = 'off' | 'explicit' | 'no-accessibility';

type AccessibilityLevel =
  | 'explicit' // require an accessor (including public)
  | 'no-public'; // don't require public

export type AccessibilityFixWith = 'public' | 'protected' | 'private';

type AccessibilityLevelAndFixer =
  | 'off'
  | {
      accessibility: 'explicit';
      fixWith: AccessibilityFixWith;
      ignoredNames?: string[];
    }
  | {
      accessibility: 'no-public';
      ignoredNames?: string[];
    };

interface OptionOverrides {
  constructors: AccessibilityLevel | AccessibilityLevelAndFixer;
  parameterProperties: AccessibilityLevel | AccessibilityLevelAndFixer;
  properties: AccessibilityLevel | AccessibilityLevelAndFixer;
  accessors: AccessibilityLevel | AccessibilityLevelAndFixer;
  methods: AccessibilityLevel | AccessibilityLevelAndFixer;
}

export interface ExplicitMemberAccessibilityOption {
  accessibility?: 'off' | AccessibilityLevel;
  fixWith?: AccessibilityFixWith;
  ignoredNames?: string[];
  staticAccessibility?: StaticAccessibilityLevel;
  overrides?: Partial<OptionOverrides>;
}

export type ExplicitMemberAccessibilityMessageIds = 'unwantedPublicAccessibility' | 'missingAccessibility';

type ReportIssue = (
  messageId: ExplicitMemberAccessibilityMessageIds,
  node: TSESTree.Node,
  nodeType: string,
  nodeName: string,
  fix?: TSESLint.ReportFixFunction,
) => void;

const getAccessibilityFixer = (
  code: TSESLint.SourceCode,
  node:
    | TSESTree.MethodDefinition
    | TSESTree.TSAbstractMethodDefinition
    | TSESTree.PropertyDefinition
    | TSESTree.TSAbstractPropertyDefinition
    | TSESTree.TSParameterProperty,
  mode: 'add' | 'remove' | 'replace',
  char: string,
  newChar: string = '',
) => {
  return function (fixer: TSESLint.RuleFixer): TSESLint.RuleFix {
    const tokens = code.getTokens(node);

    let changRange: TSESLint.AST.Range = [0, 0];

    if (mode === 'add') {
      if (node.decorators?.length) {
        changRange = node.decorators[node.decorators.length - 1].range;
        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i];
          if (token.range[0] > changRange[1]) {
            return fixer.insertTextBefore(token, `${char} `);
          }
        }
      }

      return fixer.insertTextBefore(node, `${char} `);
    }

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.type === AST_TOKEN_TYPES.Keyword && token.value === char) {
        const commensAfterPublicKeyword = code.getCommentsAfter(token);
        if (commensAfterPublicKeyword.length) {
          // public /* Hi there! */ static foo()
          // ^^^^^^^
          changRange = [token.range[0], commensAfterPublicKeyword[0].range[0]];
          break;
        } else {
          // public static foo()
          // ^^^^^^^
          changRange = [token.range[0], tokens[i + 1].range[0]];
          break;
        }
      }
    }

    return mode === 'replace' ? fixer.replaceTextRange(changRange!, `${newChar} `) : fixer.removeRange(changRange!);
  };
};

const checkStaticModifier = (
  code: TSESLint.SourceCode,
  accessibility: StaticAccessibilityLevel,
  reportIssue: ReportIssue,
  node:
    | TSESTree.MethodDefinition
    | TSESTree.TSAbstractMethodDefinition
    | TSESTree.PropertyDefinition
    | TSESTree.TSAbstractPropertyDefinition
    | TSESTree.TSParameterProperty,
  nodeType: string,
  nodeName: string,
  noFix?: true,
) => {
  if (!node.static) return true;
  if (accessibility === 'off') return;

  switch (accessibility) {
    case 'explicit':
      if (!node.accessibility) {
        reportIssue(
          'unwantedPublicAccessibility',
          node,
          nodeType,
          nodeName,
          !noFix ? getAccessibilityFixer(code, node, 'add', 'public') : undefined,
        );
      } else if (node.accessibility !== 'public') {
        reportIssue(
          'missingAccessibility',
          node,
          nodeType,
          nodeName,
          !noFix ? getAccessibilityFixer(code, node, 'replace', node.accessibility ?? '', 'public') : undefined,
        );
      }
      break;
    case 'no-accessibility':
      if (node.accessibility) {
        reportIssue(
          'missingAccessibility',
          node,
          nodeType,
          nodeName,
          !noFix ? getAccessibilityFixer(code, node, 'remove', node.accessibility) : undefined,
        );
      }
      break;
  }
};

const checkAccessibilityModifier = (
  code: TSESLint.SourceCode,
  prop: Exclude<AccessibilityLevelAndFixer, 'off'>,
  reportIssue: ReportIssue,
  node:
    | TSESTree.MethodDefinition
    | TSESTree.TSAbstractMethodDefinition
    | TSESTree.PropertyDefinition
    | TSESTree.TSAbstractPropertyDefinition
    | TSESTree.TSParameterProperty,
  nodeType: string,
  nodeName: string,
  noFix?: true,
) => {
  if (prop.ignoredNames?.includes(nodeName)) return;

  switch (prop.accessibility) {
    case 'explicit':
      if (!node.accessibility) {
        reportIssue(
          'unwantedPublicAccessibility',
          node,
          nodeType,
          nodeName,
          !noFix ? getAccessibilityFixer(code, node, 'add', prop.fixWith) : undefined,
        );
      }
      break;
    case 'no-public':
      if (node.accessibility === 'public') {
        reportIssue(
          'missingAccessibility',
          node,
          nodeType,
          nodeName,
          !noFix ? getAccessibilityFixer(code, node, 'remove', 'public') : undefined,
        );
      }
      break;
  }
};

const parseOverrideAccessibility = (
  value: 'off' | AccessibilityLevel | AccessibilityLevelAndFixer | undefined,
  option: {
    accessibility: 'off' | AccessibilityLevel;
    ignoredNames: string[];
  },
  fixWith: AccessibilityFixWith = 'protected',
): AccessibilityLevelAndFixer => {
  if (value === 'off') return 'off';
  const hasFixer = typeof value === 'object';

  const accessibility = (hasFixer ? value.accessibility : value) || option.accessibility;
  const ignoredNames = [...((hasFixer && value.ignoredNames) || option.ignoredNames)];

  switch (accessibility) {
    case 'off':
      return 'off';
    case 'no-public':
      return {
        accessibility: 'no-public',
        ignoredNames,
      };
    case 'explicit':
    default:
      return {
        accessibility: 'explicit',
        fixWith: (hasFixer && value.accessibility === 'explicit' && value.fixWith) || fixWith,
        ignoredNames,
      };
  }
};

const create: ESLintUtils.RuleCreateAndOptions<
  [ExplicitMemberAccessibilityOption],
  ExplicitMemberAccessibilityMessageIds,
  TSESLint.RuleListener
>['create'] = (context, defaultOptions) => {
  const options = context.options || [];
  const option = options[0] || defaultOptions[0] || {};

  const fixWith = option.fixWith ?? 'protected';
  const baseOption = {
    accessibility: option.accessibility || 'explicit',
    ignoredNames: [...new Set(option.ignoredNames || []).values()],
  };
  const overrides = option.overrides || {};

  const realOption = {
    staticAccessibility: (option.staticAccessibility || 'no-accessibility') as StaticAccessibilityLevel,
    constructors: parseOverrideAccessibility(
      overrides?.constructors,
      baseOption.accessibility === 'explicit' ? { accessibility: 'no-public', ignoredNames: [] } : baseOption,
      option.fixWith ?? 'public',
    ),
    parameterProperties: parseOverrideAccessibility(overrides.parameterProperties, baseOption, fixWith),
    properties: parseOverrideAccessibility(overrides.properties, baseOption, fixWith),
    accessors: parseOverrideAccessibility(overrides.accessors, baseOption, fixWith),
    methods: parseOverrideAccessibility(overrides.methods, baseOption, fixWith),
  };

  const reportIssue: ReportIssue = (messageId, node, nodeType, nodeName, fix) => {
    context.report({
      node,
      messageId,
      data: {
        type: nodeType,
        name: nodeName,
      },
      fix: fix ?? null,
    });
  };

  const sourceCode = context.getSourceCode();

  return {
    MethodDefinition: (node) => checkMethodAccessibilityModifier(sourceCode, realOption, reportIssue, node),
    TSAbstractMethodDefinition: (node) => checkMethodAccessibilityModifier(sourceCode, realOption, reportIssue, node),
    PropertyDefinition: (node) => checkPropertyAccessibilityModifier(sourceCode, realOption, reportIssue, node),
    TSAbstractPropertyDefinition: (node) =>
      checkPropertyAccessibilityModifier(sourceCode, realOption, reportIssue, node),
    TSParameterProperty: (node) =>
      checkParameterPropertyAccessibilityModifier(sourceCode, realOption.parameterProperties, reportIssue, node),
  };
};

function checkMethodAccessibilityModifier(
  code: TSESLint.SourceCode,
  option: {
    staticAccessibility: StaticAccessibilityLevel;
    constructors: AccessibilityLevelAndFixer;
    accessors: AccessibilityLevelAndFixer;
    methods: AccessibilityLevelAndFixer;
  },
  reportIssue: ReportIssue,
  node: TSESTree.MethodDefinition | TSESTree.TSAbstractMethodDefinition,
) {
  let nodeType = 'method definition';
  let accessibility: 'off' | AccessibilityLevel = 'off';
  let ignoredNames: string[] = [];
  let fixWith: AccessibilityFixWith = 'protected';

  switch (node.kind) {
    case 'constructor':
      if (option.constructors === 'off') break;
      accessibility = option.constructors.accessibility;
      ignoredNames = option.constructors.ignoredNames || [];
      if (option.constructors.accessibility === 'explicit') fixWith = option.constructors.fixWith;
      break;
    case 'get':
    case 'set':
      nodeType = `${node.kind} property accessor`;
      if (option.accessors === 'off') break;
      accessibility = option.accessors.accessibility;
      ignoredNames = option.accessors.ignoredNames || [];
      if (option.accessors.accessibility === 'explicit') fixWith = option.accessors.fixWith;
      break;
    case 'method':
    default:
      if (option.methods === 'off') break;
      accessibility = option.methods.accessibility;
      ignoredNames = option.methods.ignoredNames || [];
      if (option.methods.accessibility === 'explicit') fixWith = option.methods.fixWith;
      break;
  }

  const { name: nodeName } = utils.getNameFromMember(node, code);

  if (!checkStaticModifier(code, option.staticAccessibility, reportIssue, node, nodeType, nodeName)) return;

  if (accessibility === 'off' || node.key.type === AST_NODE_TYPES.PrivateIdentifier) return;

  checkAccessibilityModifier(
    code,
    {
      accessibility,
      fixWith,
      ignoredNames,
    },
    reportIssue,
    node,
    nodeType,
    nodeName,
  );
}

function checkPropertyAccessibilityModifier(
  code: TSESLint.SourceCode,
  option: {
    staticAccessibility: StaticAccessibilityLevel;
    properties: AccessibilityLevelAndFixer;
  },
  reportIssue: ReportIssue,
  node: TSESTree.PropertyDefinition | TSESTree.TSAbstractPropertyDefinition,
) {
  const { name: nodeName } = utils.getNameFromMember(node, code);
  const nodeType = 'class property';

  if (!checkStaticModifier(code, option.staticAccessibility, reportIssue, node, nodeType, nodeName)) return;

  if (option.properties === 'off' || node.key.type === AST_NODE_TYPES.PrivateIdentifier) return;

  checkAccessibilityModifier(code, option.properties, reportIssue, node, nodeType, nodeName);
}

function checkParameterPropertyAccessibilityModifier(
  code: TSESLint.SourceCode,
  prop: AccessibilityLevelAndFixer,
  reportIssue: ReportIssue,
  node: TSESTree.TSParameterProperty,
) {
  if (prop === 'off' || !node.readonly || node.parameter.type === AST_NODE_TYPES.RestElement) return;

  const nodeName =
    node.parameter.type === AST_NODE_TYPES.Identifier
      ? node.parameter.name
      : ((node.parameter as unknown as TSESTree.AssignmentPattern).left as TSESTree.Identifier).name;

  checkAccessibilityModifier(code, prop, reportIssue, node, 'parameter property', nodeName);
}

const sampleAccessibilityLevel = { enum: ['explicit', 'no-public'] };

const fullAccessibilityLevel = { enum: [...sampleAccessibilityLevel.enum, 'off'] };

const fixWithLevel = { enum: ['public', 'protected', 'private'] };

const schemaOverrideProperties = {
  accessibility: fullAccessibilityLevel,
  fixWith: fixWithLevel,
  ignoredNames: {
    type: 'array',
    items: {
      type: 'string',
    },
  },
};

const schemaOverride = {
  oneOf: [
    fullAccessibilityLevel,
    {
      type: 'object',
      properties: schemaOverrideProperties,
      additionalProperties: false,
    },
  ],
};

const schema = [
  {
    type: 'object',
    properties: {
      ...schemaOverrideProperties,
      staticAccessibility: { enum: ['off', 'explicit', 'no-accessibility'] },
      overrides: {
        type: 'object',
        properties: {
          accessors: schemaOverride,
          constructors: schemaOverride,
          methods: schemaOverride,
          properties: schemaOverride,
          parameterProperties: schemaOverride,
        },
      },
    },
    additionalProperties: false,
  },
];

export const name = 'explicit-member-accessibility' as const;

export const rule = ESLintUtils.RuleCreator((ruleName) => `https://typescript-eslint.io/rules/${ruleName}/`)({
  name,
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      recommended: false,
      description: 'Require explicit accessibility modifiers on class properties and methods',
    },
    messages: {
      missingAccessibility: 'Missing accessibility modifier on {{type}} {{name}}.',
      unwantedPublicAccessibility: 'Public accessibility modifier on {{type}} {{name}}.',
    },
    schema,
  },
  defaultOptions: [
    {
      accessibility: 'explicit',
      staticAccessibility: 'no-accessibility',
      fixWith: 'protected',
      overrides: {
        constructors: 'no-public',
      },
    },
  ],
  create,
});
