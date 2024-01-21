import { AST_NODE_TYPES, AST_TOKEN_TYPES } from '@typescript-eslint/types';
import { ESLintUtils, TSESLint, TSESTree } from '@typescript-eslint/utils';

import { ReportIssueData, ReportIssueFunc } from './types';
import { getContextReportIssue, getNameFromMember } from './utils';

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

export type ExplicitMemberAccessibilityMessageIds =
  | 'unwantedPublicAccessibility'
  | 'missingAccessibility';

type ReportIssue = ReportIssueFunc<ExplicitMemberAccessibilityMessageIds>;

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
  newChar: string = ''
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
        } else {
          // public static foo()
          // ^^^^^^^
          changRange = [token.range[0], tokens[i + 1].range[0]];
        }
        break;
      }
    }

    return mode === 'replace'
      ? fixer.replaceTextRange(changRange!, `${newChar} `)
      : fixer.removeRange(changRange!);
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
  data: ReportIssueData,
  noFix?: true
) => {
  if (!node.static) return true;
  if (accessibility === 'off') return;

  switch (accessibility) {
    case 'explicit':
      if (!node.accessibility) {
        reportIssue(
          'unwantedPublicAccessibility',
          node,
          !noFix ? getAccessibilityFixer(code, node, 'add', 'public') : null,
          { data }
        );
      } else if (node.accessibility !== 'public') {
        reportIssue(
          'missingAccessibility',
          node,
          !noFix
            ? getAccessibilityFixer(
                code,
                node,
                'replace',
                node.accessibility ?? '',
                'public'
              )
            : null,
          { data }
        );
      }
      break;
    case 'no-accessibility':
      if (node.accessibility) {
        reportIssue(
          'missingAccessibility',
          node,
          !noFix
            ? getAccessibilityFixer(code, node, 'remove', node.accessibility)
            : null,
          { data }
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
  data: ReportIssueData,
  noFix?: true
) => {
  if (prop.ignoredNames?.includes(data.name)) return;

  switch (prop.accessibility) {
    case 'explicit':
      if (!node.accessibility) {
        reportIssue(
          'unwantedPublicAccessibility',
          node,
          !noFix
            ? getAccessibilityFixer(code, node, 'add', prop.fixWith)
            : null,
          { data }
        );
      }
      break;
    case 'no-public':
      if (node.accessibility === 'public') {
        reportIssue(
          'missingAccessibility',
          node,
          !noFix ? getAccessibilityFixer(code, node, 'remove', 'public') : null,
          { data }
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
  fixWith: AccessibilityFixWith = 'protected'
): AccessibilityLevelAndFixer => {
  if (value === 'off') return 'off';
  const hasFixer = typeof value === 'object';

  const accessibility =
    (hasFixer ? value.accessibility : value) || option.accessibility;
  const ignoredNames = [
    ...((hasFixer && value.ignoredNames) || option.ignoredNames)
  ];

  switch (accessibility) {
    case 'off':
      return 'off';
    case 'no-public':
      return {
        accessibility: 'no-public',
        ignoredNames
      };
    case 'explicit':
    default:
      return {
        accessibility: 'explicit',
        fixWith:
          (hasFixer && value.accessibility === 'explicit' && value.fixWith) ||
          fixWith,
        ignoredNames
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
    ignoredNames: [...new Set(option.ignoredNames || []).values()]
  };
  const overrides = option.overrides || {};

  const realOption = {
    staticAccessibility: (option.staticAccessibility ||
      'no-accessibility') as StaticAccessibilityLevel,
    constructors: parseOverrideAccessibility(
      overrides?.constructors,
      baseOption.accessibility === 'explicit'
        ? { accessibility: 'no-public', ignoredNames: [] }
        : baseOption,
      option.fixWith ?? 'public'
    ),
    parameterProperties: parseOverrideAccessibility(
      overrides.parameterProperties,
      baseOption,
      fixWith
    ),
    properties: parseOverrideAccessibility(
      overrides.properties,
      baseOption,
      fixWith
    ),
    accessors: parseOverrideAccessibility(
      overrides.accessors,
      baseOption,
      fixWith
    ),
    methods: parseOverrideAccessibility(overrides.methods, baseOption, fixWith)
  };

  const reportIssue = getContextReportIssue(context);

  const sourceCode = context.getSourceCode();

  return {
    MethodDefinition: node =>
      checkMethodAccessibilityModifier(
        sourceCode,
        node,
        realOption,
        reportIssue
      ),
    TSAbstractMethodDefinition: node =>
      checkMethodAccessibilityModifier(
        sourceCode,
        node,
        realOption,
        reportIssue
      ),
    PropertyDefinition: node =>
      checkPropertyAccessibilityModifier(
        sourceCode,
        node,
        realOption,
        reportIssue
      ),
    TSAbstractPropertyDefinition: node =>
      checkPropertyAccessibilityModifier(
        sourceCode,
        node,
        realOption,
        reportIssue
      ),
    TSParameterProperty: node =>
      checkParameterPropertyAccessibilityModifier(
        sourceCode,
        node,
        realOption.parameterProperties,
        reportIssue
      )
  };
};

function checkMethodAccessibilityModifier(
  code: TSESLint.SourceCode,
  node: TSESTree.MethodDefinition | TSESTree.TSAbstractMethodDefinition,
  option: {
    staticAccessibility: StaticAccessibilityLevel;
    constructors: AccessibilityLevelAndFixer;
    accessors: AccessibilityLevelAndFixer;
    methods: AccessibilityLevelAndFixer;
  },
  reportIssue: ReportIssue
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
      if (option.constructors.accessibility === 'explicit')
        fixWith = option.constructors.fixWith;
      break;
    case 'get':
    case 'set':
      nodeType = `${node.kind} property accessor`;
      if (option.accessors === 'off') break;
      accessibility = option.accessors.accessibility;
      ignoredNames = option.accessors.ignoredNames || [];
      if (option.accessors.accessibility === 'explicit')
        fixWith = option.accessors.fixWith;
      break;
    case 'method':
    default:
      if (option.methods === 'off') break;
      accessibility = option.methods.accessibility;
      ignoredNames = option.methods.ignoredNames || [];
      if (option.methods.accessibility === 'explicit')
        fixWith = option.methods.fixWith;
      break;
  }

  const { name: nodeName } = getNameFromMember(node, code);

  const data = { type: nodeType, name: nodeName };

  if (
    !checkStaticModifier(
      code,
      option.staticAccessibility,
      reportIssue,
      node,
      data
    )
  )
    return;

  if (
    accessibility === 'off' ||
    node.key.type === AST_NODE_TYPES.PrivateIdentifier
  )
    return;

  checkAccessibilityModifier(
    code,
    {
      accessibility,
      fixWith,
      ignoredNames
    },
    reportIssue,
    node,
    data
  );
}

function checkPropertyAccessibilityModifier(
  code: TSESLint.SourceCode,
  node: TSESTree.PropertyDefinition | TSESTree.TSAbstractPropertyDefinition,
  option: {
    staticAccessibility: StaticAccessibilityLevel;
    properties: AccessibilityLevelAndFixer;
  },
  reportIssue: ReportIssue
) {
  const { name: nodeName } = getNameFromMember(node, code);
  const data = { type: 'class property', name: nodeName };

  if (
    !checkStaticModifier(
      code,
      option.staticAccessibility,
      reportIssue,
      node,
      data
    )
  )
    return;

  if (
    option.properties === 'off' ||
    node.key.type === AST_NODE_TYPES.PrivateIdentifier
  )
    return;

  checkAccessibilityModifier(code, option.properties, reportIssue, node, data);
}

function checkParameterPropertyAccessibilityModifier(
  code: TSESLint.SourceCode,
  node: TSESTree.TSParameterProperty,
  prop: AccessibilityLevelAndFixer,
  reportIssue: ReportIssue
) {
  if (
    prop === 'off' ||
    !node.readonly ||
    node.parameter.type === AST_NODE_TYPES.RestElement
  )
    return;

  const nodeName =
    node.parameter.type === AST_NODE_TYPES.Identifier
      ? node.parameter.name
      : (
          (node.parameter as unknown as TSESTree.AssignmentPattern)
            .left as TSESTree.Identifier
        ).name;

  checkAccessibilityModifier(code, prop, reportIssue, node, {
    type: 'parameter property',
    name: nodeName
  });
}

const SampleAccessibilityLevels = ['off', 'explicit'];

const FullAccessibilityLevel = {
  enum: [...SampleAccessibilityLevels, 'no-public']
};

const SchemaOverrideProperties = {
  accessibility: FullAccessibilityLevel,
  fixWith: { enum: ['public', 'protected', 'private'] },
  ignoredNames: {
    type: 'array',
    items: {
      type: 'string'
    }
  }
};

const SchemaOverride = {
  oneOf: [
    FullAccessibilityLevel,
    {
      type: 'object',
      properties: SchemaOverrideProperties,
      additionalProperties: false
    }
  ]
};

const name = 'explicit-member-accessibility' as const;

const rule = ESLintUtils.RuleCreator(
  ruleName => `https://typescript-eslint.io/rules/${ruleName}/`
)({
  name,
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      recommended: false,
      description:
        'Require explicit accessibility modifiers on class properties and methods'
    },
    messages: {
      missingAccessibility:
        'Missing accessibility modifier on {{type}} {{name}}.',
      unwantedPublicAccessibility:
        'Public accessibility modifier on {{type}} {{name}}.'
    },
    schema: [
      {
        type: 'object',
        properties: {
          ...SchemaOverrideProperties,
          staticAccessibility: {
            enum: [...SampleAccessibilityLevels, 'no-accessibility']
          },
          overrides: {
            type: 'object',
            properties: {
              accessors: SchemaOverride,
              constructors: SchemaOverride,
              methods: SchemaOverride,
              properties: SchemaOverride,
              parameterProperties: SchemaOverride
            }
          }
        },
        additionalProperties: false
      }
    ]
  },
  defaultOptions: [
    {
      accessibility: 'explicit',
      staticAccessibility: 'no-accessibility',
      fixWith: 'protected',
      overrides: {
        constructors: 'no-public'
      }
    }
  ],
  create
});

export default { name, rule };
