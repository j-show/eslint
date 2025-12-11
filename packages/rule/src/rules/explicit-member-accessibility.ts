/**
 * `explicit-member-accessibility` 规则
 *
 * 该规则会遍历所有类成员/参数属性，统一判断其访问修饰符是否符合配置要求，
 * 并在可能时给出自动修复方案。内部通过 `check*AccessibilityModifier` 三组
 * 检查器复用一套 fixer 逻辑，以此在 TS/JS 的 Method、Property、Parameter
 * Property 上实现统一体验。
 *
 * @module explicit-member-accessibility
 */
import { AST_NODE_TYPES, AST_TOKEN_TYPES } from '@typescript-eslint/types';
import {
  ESLintUtils,
  type JSONSchema,
  type TSESLint,
  type TSESTree
} from '@typescript-eslint/utils';

import {
  type ReportIssueData,
  type ReportIssueFunc,
  type RuleDefinition
} from './types';
import { getContextReportIssue, getNameFromMember } from './utils';

/**
 * staticAccessibility:
 * - 'off'：静态成员不额外处理，完全交给后续逻辑。
 * - 'explicit'：所有 static 成员必须显式声明 public。
 * - 'no-accessibility'：static 成员禁止出现任何访问修饰符。
 */
type StaticAccessibilityLevel = 'off' | 'explicit' | 'no-accessibility';

/**
 * 非静态成员的主模式：
 * - 'explicit'：要求成员必须带访问修饰符，可结合 fixWith 自动补齐。
 * - 'no-public'：仅禁止 public，允许其它修饰符或留空。
 */
type AccessibilityLevel = 'explicit' | 'no-public';

/**
 * 访问修饰符修复目标值
 *
 * fixer 在补齐显式修饰符时可选的目标值：
 * - `public`：适用于完全公开 API，例如框架导出的类
 * - `protected`：默认行为，兼顾继承层级的可见性
 * - `private`：适用于只在类内部使用的成员
 */
export type AccessibilityFixWith = 'public' | 'protected' | 'private';

/**
 * override 内部实际消费的数据结构，兼容字符串与对象配置写法。
 */
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

/**
 * 针对不同成员类型的覆写入口：
 * - constructors：构造函数多用于依赖注入，默认倾向禁止 public。
 * - parameterProperties：TS 特有语法，通常跟随 readonly 语义。
 * - properties/accessors/methods：常规类成员，可单独指派策略。
 */
interface OptionOverrides {
  constructors: AccessibilityLevel | AccessibilityLevelAndFixer;
  parameterProperties: AccessibilityLevel | AccessibilityLevelAndFixer;
  properties: AccessibilityLevel | AccessibilityLevelAndFixer;
  accessors: AccessibilityLevel | AccessibilityLevelAndFixer;
  methods: AccessibilityLevel | AccessibilityLevelAndFixer;
}

/**
 * 显式成员访问修饰符规则配置
 *
 * @property accessibility - 全局默认策略（'off' 关闭、'explicit' 强制补齐、'no-public' 禁止 public）
 * @property fixWith - 当需要补齐显式修饰符时使用的默认取值，常见于团队统一要求 protected
 * @property ignoredNames - 白名单成员名，适用于兼容遗留 API
 * @property staticAccessibility - 静态成员专属策略，详见 StaticAccessibilityLevel 注释
 * @property overrides - 按成员类型细化策略，可传入字符串或对象写法
 *
 * @example
 * ```ts
 * {
 *   accessibility: 'explicit',
 *   fixWith: 'protected',
 *   ignoredNames: ['legacyMethod'],
 *   staticAccessibility: 'no-accessibility',
 *   overrides: {
 *     constructors: 'no-public',
 *     methods: { accessibility: 'explicit', fixWith: 'public' }
 *   }
 * }
 * ```
 */
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

const DEFAULT_OPTION: Required<ExplicitMemberAccessibilityOption> = {
  accessibility: 'explicit',
  staticAccessibility: 'no-accessibility',
  fixWith: 'protected',
  ignoredNames: [],
  overrides: {
    constructors: 'no-public'
  }
};

/**
 * 根据不同的修改模式生成 fixer。
 * - add：在成员前插入修饰符
 * - remove：删除已有修饰符
 * - replace：替换为新的修饰符
 */
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
      // 插入模式下需要把修饰符放在 decorator 之后、成员定义之前
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
        const commentsAfterPublicKeyword = code.getCommentsAfter(token);
        if (commentsAfterPublicKeyword.length > 0) {
          // public /* Hi there! */ static foo()
          // ^^^^^^^
          changRange = [token.range[0], commentsAfterPublicKeyword[0].range[0]];
        } else {
          // public static foo()
          // ^^^^^^^
          const nextToken = tokens[i + 1];
          if (nextToken) {
            changRange = [token.range[0], nextToken.range[0]];
          } else {
            changRange = token.range;
          }
        }
        break;
      }
    }

    // 根据不同模式采用替换或删除，最终都携带空格防止粘连
    return mode === 'replace'
      ? fixer.replaceTextRange(changRange, `${newChar} `)
      : fixer.removeRange(changRange);
  };
};

/**
 * 静态成员单独处理：无论主配置如何，staticAccessibility 都会最先执行。
 * 当返回 `false` 表示已经报错且无需继续后续检查。
 */
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
  // 非静态成员直接通过，static 为 false 时后续流程可以继续检查
  if (!node.static) return true;
  if (accessibility === 'off') return;

  switch (accessibility) {
    case 'explicit':
      // 要求显式 public：缺失时补全，非 public 时替换
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
      // 禁止任何访问修饰符，直接移除已有关键字
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

/**
 * 通用成员修饰符检查逻辑，所有 kind 最终都会委托到这里。
 * 通过 `prop` 传入 fix 配置（包括 ignoredNames）。
 */
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
  // 可被忽略的成员直接跳过，避免与遗留 API 冲突
  if (prop.ignoredNames?.includes(data.name)) return;

  switch (prop.accessibility) {
    case 'explicit':
      // 未声明访问修饰符时插入预设值（public/protected/private）
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
      // 仅禁止 public，命中后移除即可
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

/**
 * 将 override 兼容的多种写法(`'off'`/字符串/对象)规范化为统一结构，
 * 方便后续逻辑直接消费。
 */
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
      // 只禁止 public，沿用汇总后的 ignoredNames
      return {
        accessibility: 'no-public',
        ignoredNames
      };
    case 'explicit':
    default:
      // explicit 需要携带 fixWith，若未配置则使用 fallback
      return {
        accessibility: 'explicit',
        fixWith:
          (hasFixer && value.accessibility === 'explicit' && value.fixWith) ||
          fixWith,
        ignoredNames
      };
  }
};

/**
 * Method/Accessor/Constructor 的主入口，负责：
 * 1. 根据 kind 选择对等的 override
 * 2. 运行静态修饰符检查
 * 3. 委托给通用检查逻辑
 */
/**
 * 检查并报告方法（MethodDefinition/TSAbstractMethodDefinition）上的显式可访问性修饰符。
 *
 * 该函数做了如下几件事情：
 * 1. 首先根据 node.kind（constructor/get/set/method）判断当前节点类型，
 *    并从 option 里取出对应的配置（accessibility、ignoredNames、fixWith）。
 *    若某种类型被设置为 'off'，则直接跳过后续检查。
 * 2. 利用 getNameFromMember 获取成员具体名称，便于后续报告可读性。
 * 3. 构造 data 对象作为报告时的上下文，包含 type & name 信息。
 * 4. 先行检查 static 修饰符要求（如 staticAccessibility 是 explicit 时），
 *    若 static 设置不符直接返回，无需再检查访问级别。
 * 5. 如果本成员类型的可访问性设置为 'off' 或节点为私有 class 字段（#foo），直接退出。
 * 6. 调用通用的 checkAccessibilityModifier，检查并报告是否缺少 public/private/protected，
 *    若缺失则可由 fixer 自动修复。
 */
const checkMethodAccessibilityModifier = (
  code: TSESLint.SourceCode,
  node: TSESTree.MethodDefinition | TSESTree.TSAbstractMethodDefinition,
  option: {
    staticAccessibility: StaticAccessibilityLevel;
    constructors: AccessibilityLevelAndFixer;
    accessors: AccessibilityLevelAndFixer;
    methods: AccessibilityLevelAndFixer;
  },
  reportIssue: ReportIssue
): void => {
  // 1. 根据 kind 选中目标配置、可访问性级别、fixWith 策略以及忽略名单
  let nodeType = 'method definition';
  let accessibility: 'off' | AccessibilityLevel = 'off';
  let ignoredNames: string[] = [];
  let fixWith: AccessibilityFixWith = 'protected';

  switch (node.kind) {
    case 'constructor':
      // 构造函数专属配置
      if (option.constructors === 'off') break;
      accessibility = option.constructors.accessibility;
      ignoredNames = option.constructors.ignoredNames || [];
      if (option.constructors.accessibility === 'explicit')
        fixWith = option.constructors.fixWith;
      break;
    case 'get':
    case 'set':
      // 属性访问器（getter/setter）专属配置
      nodeType = `${node.kind} property accessor`;
      if (option.accessors === 'off') break;
      accessibility = option.accessors.accessibility;
      ignoredNames = option.accessors.ignoredNames || [];
      if (option.accessors.accessibility === 'explicit')
        fixWith = option.accessors.fixWith;
      break;
    case 'method':
    default:
      // 普通方法专属配置
      if (option.methods === 'off') break;
      accessibility = option.methods.accessibility;
      ignoredNames = option.methods.ignoredNames || [];
      if (option.methods.accessibility === 'explicit')
        fixWith = option.methods.fixWith;
      break;
  }

  // 2. 获取当前成员名字（用于报告提示时的描述）
  const { name: nodeName } = getNameFromMember(node, code);

  // 3. 构造报告辅助上下文对象
  const data = { type: nodeType, name: nodeName };

  // 4. 优先检查 static 修饰符是否被显式声明，若强制要求且缺失则直接返回
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

  // 5. 检查访问修饰符要求
  //    - 若本类别被关闭，或者本成员为私有 class 字段（#foo），则跳过
  if (
    accessibility === 'off' ||
    node.key.type === AST_NODE_TYPES.PrivateIdentifier
  )
    return;

  // 6. 否则统一交由通用访问级别检查函数处理
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
};

/**
 * 处理 `PropertyDefinition` / `TSAbstractPropertyDefinition`。
 * 主要关注静态修饰符 + override 的组合结果。
 */
const checkPropertyAccessibilityModifier = (
  code: TSESLint.SourceCode,
  node: TSESTree.PropertyDefinition | TSESTree.TSAbstractPropertyDefinition,
  option: {
    staticAccessibility: StaticAccessibilityLevel;
    properties: AccessibilityLevelAndFixer;
  },
  reportIssue: ReportIssue
): void => {
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

  // 私有字段与关闭状态无需继续检查
  if (
    option.properties === 'off' ||
    node.key.type === AST_NODE_TYPES.PrivateIdentifier
  )
    return;

  // 交由通用逻辑处理显式/禁止 public 这两种分支
  checkAccessibilityModifier(code, option.properties, reportIssue, node, data);
};

/**
 * 参数属性在 TS 中以 `TSParameterProperty` 表现。
 * 这里限制只处理 readonly 参数，避免和普通 constructor 参数冲突。
 */
const checkParameterPropertyAccessibilityModifier = (
  code: TSESLint.SourceCode,
  node: TSESTree.TSParameterProperty,
  prop: AccessibilityLevelAndFixer,
  reportIssue: ReportIssue
): void => {
  // 仅对 readonly 参数属性生效，避免与普通 constructor 参数混淆
  if (prop === 'off' || !node.readonly) return;

  const parameter = node.parameter;
  const identifier =
    // eslint-disable-next-line no-nested-ternary
    parameter.type === AST_NODE_TYPES.Identifier
      ? parameter
      : parameter.type === AST_NODE_TYPES.AssignmentPattern &&
        parameter.left.type === AST_NODE_TYPES.Identifier
      ? parameter.left
      : null;

  if (!identifier) return;

  // 匹配到真正的 Identifier 后即可交给通用检查器
  checkAccessibilityModifier(code, prop, reportIssue, node, {
    type: 'parameter property',
    name: identifier.name
  });
};

const create: ESLintUtils.RuleCreateAndOptions<
  [ExplicitMemberAccessibilityOption],
  ExplicitMemberAccessibilityMessageIds
>['create'] = (context, defaultOptions) => {
  // 获取用户传入的配置项（若有），否则使用默认规则
  const option = context.options?.[0] || defaultOptions?.[0] || DEFAULT_OPTION;

  // 1. 解析 fixWith 的默认值（未配置时为 'protected'）
  const fixWith = option.fixWith ?? DEFAULT_OPTION.fixWith;

  // 2. 整理基础配置，包括 accessibility 策略与 ignoredNames （去重处理）
  const baseOption = {
    accessibility: option.accessibility ?? DEFAULT_OPTION.accessibility,
    ignoredNames: [
      ...new Set(option.ignoredNames ?? DEFAULT_OPTION.ignoredNames).values()
    ]
  };

  // 3. 获取 overrides 覆写规则对象
  const overrides = option.overrides || {};

  // 4. 根据全局与 override 分别生成标准化后的配置对象 realOption（用于后续检查逻辑统一消费）
  //    - staticAccessibility：静态成员策略，默认 'no-accessibility'
  //    - constructors/parameterProperties/properties/accessors/methods：按类型细化策略
  //      并调用 parseOverrideAccessibility 生成统一结构
  const realOption = {
    staticAccessibility:
      option.staticAccessibility ?? DEFAULT_OPTION.staticAccessibility,
    constructors: parseOverrideAccessibility(
      overrides.constructors,
      baseOption.accessibility === 'explicit'
        ? { accessibility: 'no-public', ignoredNames: [] }
        : baseOption,
      fixWith
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

  // 5. 获取辅助上报工具（兼容 Context）
  const reportIssue = getContextReportIssue(context);

  // 6. 获取当前的 sourceCode 对象，便于 fixer 与位置定位使用
  const sourceCode = context.getSourceCode();

  // 7. 返回 AST 节点类型映射的各成员检查函数
  //    这部分实现与 TS/JS AST 结构解耦，分别处理不同节点类型
  //    - MethodDefinition/TSAbstractMethodDefinition ⇒ checkMethodAccessibilityModifier
  //    - PropertyDefinition/TSAbstractPropertyDefinition ⇒ checkPropertyAccessibilityModifier
  //    - TSParameterProperty ⇒ checkParameterPropertyAccessibilityModifier
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

/** 基础可访问性级别选项 */
const SAMPLE_ACCESSIBILITY_LEVELS = ['off', 'explicit'] as const;

const FullAccessibilityLevel: JSONSchema.JSONSchema4StringSchema = {
  type: 'string',
  enum: [...SAMPLE_ACCESSIBILITY_LEVELS, 'no-public']
};

const SchemaOverrideProperties: Record<string, JSONSchema.JSONSchema4> = {
  accessibility: FullAccessibilityLevel,
  fixWith: { type: 'string', enum: ['public', 'protected', 'private'] },
  ignoredNames: {
    type: 'array',
    items: {
      type: 'string'
    }
  }
};

const SchemaOverride: JSONSchema.JSONSchema4OneOfSchema = {
  oneOf: [
    FullAccessibilityLevel,
    {
      type: 'object',
      properties: SchemaOverrideProperties,
      additionalProperties: false
    }
  ]
};

const name = 'explicit-member-accessibility';

const rule = ESLintUtils.RuleCreator(
  ruleName => `https://typescript-eslint.io/rules/${ruleName}/`
)({
  name,
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
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
            type: 'string',
            enum: [...SAMPLE_ACCESSIBILITY_LEVELS, 'no-accessibility']
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
  defaultOptions: [DEFAULT_OPTION],
  create
}) as RuleDefinition;

export default { name, rule };
