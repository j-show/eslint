/**
 * 核心检测逻辑：
 * 1. 按作用域收集每个 import specifier 是否被引用。
 * 2. 完全未使用时删除整条 import。
 * 3. 部分未使用时只删除对应的 specifier，并处理收尾逗号。
 */
import { AST_NODE_TYPES } from '@typescript-eslint/types';
import {
  ESLintUtils,
  type JSONSchema,
  type TSESLint,
  type TSESTree
} from '@typescript-eslint/utils';

import { type ReportIssueFunc, type RuleDefinition } from './types';
import { getContextReportIssue, isIgnoredName, stringToRegExp } from './utils';

/**
 * 未使用导入规则配置
 *
 * @property autoFix - 'always' 会直接删除未使用 import，'off' 仅提示开发者手动处理
 * @property ignoredNames - 忽略匹配的导入名（支持字符串精确匹配或可转换为正则的字符串，如 '^_'），适配下划线等约定
 * @property ignoreJSDoc - 是否忽略 JSDoc 逻辑，默认为 true，表示忽略 JSDoc 中的引用检查
 *
 * @example
 * ```ts
 * {
 *   autoFix: 'always',
 *   ignoredNames: ['^_', '^unused'],
 *   ignoreJSDoc: true
 * }
 * ```
 */
export interface UnusedImportOption {
  autoFix?: 'off' | 'always';
  ignoredNames?: string[];
  ignoreJSDoc?: boolean;
}

export type UnusedImportMessageIds = 'unusedSingleImport' | 'unusedAllImport';

type ReportIssue = ReportIssueFunc<UnusedImportMessageIds>;

/**
 * 归一化后的配置，供核心逻辑直接消费布尔与白名单数组。
 */
interface ReportOptions {
  autoFix: boolean;
  ignoredNames: Array<string | RegExp>;
  ignoreJSDoc: boolean;
}

const DEFAULT_OPTION: Required<UnusedImportOption> = {
  autoFix: 'always',
  ignoredNames: ['^_'],
  ignoreJSDoc: true
};

/** 获取 token 时包含注释的选项 */
const INCLUDE_COMMENTS_FILTER = { includeComments: true } as const;

/**
 * 转义正则表达式特殊字符
 *
 * @param value - 待转义的字符串
 * @returns 转义后的字符串，所有特殊字符都被转义
 */
const escapeRegExp = (value: string) =>
  // 转义用户输入中的正则特殊字符，便于构造精确匹配
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * 创建用于匹配 JSDoc 中引用的正则表达式模式
 *
 * @param name - 要匹配的标识符名称
 * @returns 编译后的正则表达式，用于匹配 JSDoc 注释中的引用
 */
const createJsDocPattern = (name: string) => {
  const identifier = escapeRegExp(name);
  // 构造一个同时覆盖 @link/@see/@type 等写法的正则
  return new RegExp(
    // {@link Foo} or @see Foo
    `(?:@(?:link|linkcode|linkplain|see)\\s+${identifier}\\b)|` +
      // {@link Foo}
      `(?:\\{@(?:link|linkcode|linkplain)\\s+${identifier}\\b\\})|` +
      // @type {Foo}, @param {Foo}, etc.
      `(?:[@{](?:type|typedef|param|returns?|template|augments|extends|implements)\\s+[^}]*\\b${identifier}\\b)`,
    'u'
  );
};

/**
 * 检查标识符是否在 JSDoc 注释中被引用
 *
 * @param sourceCode - 源码访问对象
 * @param name - 要检查的标识符名称
 * @returns 如果在 JSDoc 注释中找到引用，返回 true
 */
const isUsedInJsDoc = (
  sourceCode: TSESLint.SourceCode,
  name: string
): boolean => {
  if (!sourceCode) return false;

  const pattern = createJsDocPattern(name);
  return (
    sourceCode
      .getAllComments()
      // 仅针对块注释执行匹配，避免噪声
      .some(
        comment => comment.type === 'Block' && pattern.test(comment.value || '')
      )
  );
};

/**
 * 删除整条 import 时的 fixer：除了移除语句本身，还会处理尾随空行数量。
 *
 * @param autoFix - 是否启用自动修复
 * @param sourceCode - 源码访问对象
 * @param node - 要删除的 import 声明节点
 * @returns 修复函数，如果 autoFix 为 false 则返回 null
 */
const buildRemoveImportFix = (
  autoFix: boolean,
  sourceCode: TSESLint.SourceCode,
  node: TSESTree.ImportDeclaration
): TSESLint.ReportFixFunction | null => {
  if (!autoFix) return null;

  return fixer => {
    // 先删除整条 import，再根据下一 token 调整空行
    // 避免留下多余的空白
    const fixes: TSESLint.RuleFix[] = [fixer.remove(node)];
    const nextToken = sourceCode.getTokenAfter(
      node,
      INCLUDE_COMMENTS_FILTER as any
    );
    if (!nextToken || !node.loc) return fixes;

    const nextRange = nextToken.range?.[0] ?? node.range[1];
    const newLinesBetween =
      (nextToken.loc?.start.line ?? node.loc.start.line) - node.loc.start.line;
    const count = Math.max(0, newLinesBetween - 1);

    fixes.push(
      fixer.replaceTextRange([node.range[1], nextRange], '\n'.repeat(count))
    );

    return fixes;
  };
};

/**
 * 删除单个 specifier 的 fixer：根据位置决定要不要额外移除逗号/花括号。
 *
 * @param autoFix - 是否启用自动修复
 * @param sourceCode - 源码访问对象
 * @param specifier - 要删除的 import specifier 节点
 * @returns 修复函数，如果 autoFix 为 false 则返回 null
 */
const buildRemoveSpecifierFix = (
  autoFix: boolean,
  sourceCode: TSESLint.SourceCode,
  specifier:
    | TSESTree.ImportSpecifier
    | TSESTree.ImportDefaultSpecifier
    | TSESTree.ImportNamespaceSpecifier
): TSESLint.ReportFixFunction | null => {
  if (!autoFix) return null;

  return fixer => {
    const declaration = specifier.parent as TSESTree.ImportDeclaration | null;
    if (!declaration) return null;

    if (declaration.specifiers.length === 1) {
      // 仅剩一个 specifier 时直接回退到整条 import 删除
      return (
        buildRemoveImportFix(true, sourceCode, declaration)?.(fixer) ?? null
      );
    }

    const lastSpecifier = declaration.specifiers.at(-1);

    if (specifier !== lastSpecifier) {
      // 位于中间位置：一并移除前置空白与紧随其后的逗号
      const comma = sourceCode.getTokenAfter(
        specifier,
        token => token.value === ','
      );
      if (!comma) return null;

      const prevToken = sourceCode.getTokenBefore(specifier);
      const start = prevToken ? prevToken.range[1] : specifier.range[0];

      return [
        fixer.removeRange([start, specifier.range[0]]),
        fixer.remove(specifier),
        fixer.remove(comma)
      ];
    }

    const namedSpecifiers = declaration.specifiers.filter(
      node => node.type === AST_NODE_TYPES.ImportSpecifier
    );

    if (
      namedSpecifiers.length === 1 &&
      specifier.type === AST_NODE_TYPES.ImportSpecifier
    ) {
      // 花括号里只剩一个具名导入：移除 `{ foo }` 整段
      const commaToken = sourceCode.getTokenBefore(
        specifier,
        token => token.value === ','
      );
      const closingBrace = sourceCode.getTokenAfter(
        specifier,
        token => token.value === '}'
      );

      if (!commaToken || !closingBrace) return null;

      return fixer.removeRange([commaToken.range[0], closingBrace.range[1]]);
    }

    const commaBefore = sourceCode.getTokenBefore(
      specifier,
      token => token.value === ','
    );
    if (!commaBefore) return fixer.remove(specifier);

    // 普通尾部元素：把前置逗号一起删除，避免多余符号
    return fixer.removeRange([commaBefore.range[0], specifier.range[1]]);
  };
};

/**
 * 利用 ESLint scope API 判断 import 变量是否被引用；若引用数为 0 再 fallback 到 JSDoc 搜索。
 *
 * @param scope - 当前作用域
 * @param name - 变量名
 * @param sourceCode - 源码访问对象
 * @param ignoreJSDoc - 是否忽略 JSDoc 检查，为 true 时跳过 JSDoc 扫描
 * @returns 变量是否被使用
 */
const isUsed = (
  scope: TSESLint.Scope.Scope | null,
  name: string,
  sourceCode: TSESLint.SourceCode,
  ignoreJSDoc: boolean
) => {
  const variable = scope?.variables.find(o => o.name === name);
  if (variable && variable.references.length > 0) return true;

  // 如果忽略 JSDoc，直接返回 false
  if (ignoreJSDoc) return false;

  // ESLint 作用域未命中时，再扫描 JSDoc 里的引用
  return isUsedInJsDoc(sourceCode, name);
};

/** 支持的 import specifier 类型集合 */
const IMPORT_AST_TYPES = new Set([
  AST_NODE_TYPES.ImportSpecifier,
  AST_NODE_TYPES.ImportDefaultSpecifier,
  AST_NODE_TYPES.ImportNamespaceSpecifier
]);

/**
 * 检查并报告未使用的 import 成员。
 *
 * 该函数针对每一条 ImportDeclaration 执行，整体逻辑如下：
 * 1. 遍历 import 语句中的所有 specifier，判断哪些未被引用（isUsed）。
 * 2. 支持通过 ignoredNames 配置忽略部分变量名（如 _、正则表达式）。
 * 3. 如果全部成员都未被使用，则直接报告并建议删除整条 import。
 * 4. 如果仅部分成员未被使用，则逐个报告并建议删除对应的 specifier。
 * 5. 自动修复动作（fixer）取决于 autoFix 选项。
 * 6. ignoreJSDoc 选项控制是否检查 JSDoc 注释中的引用。
 *
 * @param scope 当前作用域，用于分析变量引用
 * @param node ImportDeclaration AST 节点
 * @param sourceCode 源码访问对象
 * @param options 规则配置（包括 autoFix、ignoredNames、ignoreJSDoc）
 * @param reportIssue 上报诊断问题的回调
 */
const checkUnusedImporter = (
  scope: TSESLint.Scope.Scope | null,
  node: TSESTree.ImportDeclaration,
  sourceCode: TSESLint.SourceCode,
  options: ReportOptions,
  reportIssue: ReportIssue
): void => {
  // 解析选项中的自动修复标志、忽略名称列表和 JSDoc 忽略标志
  const { autoFix, ignoredNames, ignoreJSDoc } = options;

  // 获取所有 import 的成员（如 { foo, bar } 里的 foo/bar）
  const specifiers = node.specifiers;
  if (specifiers.length < 1) return;

  // 过滤出所有未被使用且未被忽略的成员
  const unusedSpecifiers = specifiers.filter(specifier => {
    // 只检查三类标准的 import 成员类型
    if (!IMPORT_AST_TYPES.has(specifier.type)) return false;

    const name = specifier.local.name;
    // 如果变量在忽略列表中，跳过（支持字符串精确匹配和正则表达式匹配）
    if (isIgnoredName(name, ignoredNames)) {
      return false;
    }
    // 若未忽略且未被使用则保留
    return !isUsed(scope, name, sourceCode, ignoreJSDoc);
  });

  // 如果没有未使用的成员，直接返回
  if (unusedSpecifiers.length < 1) return;

  // 如果所有成员都未被引用，报告删除整条 import
  if (unusedSpecifiers.length === specifiers.length) {
    reportIssue(
      'unusedAllImport',
      node,
      buildRemoveImportFix(autoFix, sourceCode, node),
      {
        data: { name: unusedSpecifiers.map(o => o.local.name).join(', ') }
      }
    );
    return;
  }

  // 部分成员未被引用，单独分别报告并建议移除
  for (const specifier of unusedSpecifiers) {
    reportIssue(
      'unusedSingleImport',
      specifier,
      buildRemoveSpecifierFix(autoFix, sourceCode, specifier),
      {
        data: { name: specifier.local.name }
      }
    );
  }
};

/**
 * rule.create：每个 ImportDeclaration 都会定位对应作用域，
 * 然后交给 `checkUnusedImporter` 做细粒度判断。
 */
const create: ESLintUtils.RuleCreateAndOptions<
  [UnusedImportOption],
  UnusedImportMessageIds
>['create'] = (context, defaultOptions) => {
  const option = context.options?.[0] || defaultOptions?.[0] || DEFAULT_OPTION;

  // 优先从 context 中获取 sourceCode（早期 ESLint 版本需兼容）
  const sourceCode = context.sourceCode || context.getSourceCode();

  const realOption: ReportOptions = {
    autoFix: (option.autoFix || DEFAULT_OPTION.autoFix) === 'always',
    ignoredNames: (option.ignoredNames || DEFAULT_OPTION.ignoredNames).map(
      name => stringToRegExp(name) ?? name
    ),
    ignoreJSDoc: option.ignoreJSDoc ?? DEFAULT_OPTION.ignoreJSDoc
  };

  const reportIssue = getContextReportIssue(context);

  return {
    ImportDeclaration: node => {
      const scope = sourceCode.getScope(node);

      checkUnusedImporter(scope, node, sourceCode, realOption, reportIssue);
    }
  };
};

const SchemaOverrideProperties: Record<string, JSONSchema.JSONSchema4> = {
  autoFix: { type: 'string', enum: ['off', 'always'] },
  ignoredNames: {
    type: 'array',
    items: {
      type: 'string'
    }
  },
  ignoreJSDoc: { type: 'boolean' }
};

const name = 'unused-import';

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
      description: 'disallow unused imports'
    },
    messages: {
      unusedSingleImport: 'Unused import detected: {{name}}',
      unusedAllImport: 'All imports is unused: {{name}}'
    },
    schema: [
      {
        type: 'object',
        properties: SchemaOverrideProperties,
        additionalProperties: false
      }
    ]
  },
  defaultOptions: [DEFAULT_OPTION],
  create
}) as RuleDefinition;

export default { name, rule };
