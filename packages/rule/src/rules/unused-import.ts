/**
 * 核心检测逻辑：
 * 1. 按作用域收集每个 import specifier 是否被引用。
 * 2. 完全未使用时删除整条 import。
 * 3. 部分未使用时只删除对应的 specifier，并处理收尾逗号。
 */
import { AST_NODE_TYPES } from '@typescript-eslint/types';
import {
  ESLintUtils,
  JSONSchema,
  TSESLint,
  TSESTree
} from '@typescript-eslint/utils';

import { ReportIssueFunc, RuleDefinition } from './types';
import { getContextReportIssue } from './utils';

/**
 * 规则配置：
 * - autoFix：'always' 会直接删除未使用 import，'off' 仅提示开发者手动处理。
 * - ignoredNames：忽略匹配的导入名（支持通配符 * ? 或正则字面量 /foo/），适配下划线等约定。
 */
export interface UnusedImportOption {
  autoFix?: 'off' | 'always';
  ignoredNames?: string[];
}

export type UnusedImportMessageIds = 'unusedSingleImport' | 'unusedAllImport';

type ReportIssue = ReportIssueFunc<UnusedImportMessageIds>;

/**
 * 归一化后的配置，提前把所有忽略规则编译为正则，提升遍历效率。
 */
interface ReportOptions {
  autoFix: boolean;
  ignoredMatchers: RegExp[];
}

const includeCommentsFilter = { includeComments: true } as const;

const escapeRegExp = (value: string) =>
  // 转义用户输入中的正则特殊字符，便于构造精确匹配
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

const REGEX_LITERAL = /^\/(.+)\/([a-z]*)$/;

const createIgnoredNamePattern = (value?: string): RegExp | null => {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const literal = trimmed.match(REGEX_LITERAL);
  if (literal) {
    try {
      // 支持 /foo/i 形式的正则字面量
      return new RegExp(literal[1], literal[2]);
    } catch {
      // ignore invalid regex literal, fallback to glob conversion
    }
  }

  // 处理 glob 星号/问号，转成正则表达式
  const pattern = trimmed
    .split('')
    .map(char => {
      if (char === '*') return '.*';
      if (char === '?') return '.';
      return escapeRegExp(char);
    })
    .join('');

  return new RegExp(`^${pattern}$`);
};

const buildIgnoredNameMatchers = (names: string[] = []) =>
  names
    .map(createIgnoredNamePattern)
    // 过滤掉无法解析的配置项
    .filter((pattern): pattern is RegExp => Boolean(pattern));

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
      includeCommentsFilter as any
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
 */
const isUsed = (
  scope: TSESLint.Scope.Scope | null,
  name: string,
  sourceCode: TSESLint.SourceCode
) => {
  const variable = scope?.variables.find(o => o.name === name);
  if (variable && variable.references.length > 0) return true;

  // ESLint 作用域未命中时，再扫描 JSDoc 里的引用
  return isUsedInJsDoc(sourceCode, name);
};

const IMPORT_AST_TYPES = [
  AST_NODE_TYPES.ImportSpecifier,
  AST_NODE_TYPES.ImportDefaultSpecifier,
  AST_NODE_TYPES.ImportNamespaceSpecifier
];

/**
 * 检查并报告未使用的 import 成员。
 *
 * 该函数针对每一条 ImportDeclaration 执行，整体逻辑如下：
 * 1. 遍历 import 语句中的所有 specifier，判断哪些未被引用（isUsed）。
 * 2. 支持通过 ignoredMatchers 配置忽略部分变量名（如 _）。
 * 3. 如果全部成员都未被使用，则直接报告并建议删除整条 import。
 * 4. 如果仅部分成员未被使用，则逐个报告并建议删除对应的 specifier。
 * 5. 自动修复动作（fixer）取决于 autoFix 选项。
 *
 * @param scope 当前作用域，用于分析变量引用
 * @param node ImportDeclaration AST 节点
 * @param sourceCode 源码访问对象
 * @param options 规则配置（包括 autoFix、ignoredMatchers）
 * @param reportIssue 上报诊断问题的回调
 */
const checkUnusedImporter = (
  scope: TSESLint.Scope.Scope | null,
  node: TSESTree.ImportDeclaration,
  sourceCode: TSESLint.SourceCode,
  options: ReportOptions,
  reportIssue: ReportIssue
): void => {
  // 解析选项中的自动修复标志和忽略匹配器（正则表达式数组）
  const { autoFix, ignoredMatchers } = options;

  // 获取所有 import 的成员（如 { foo, bar } 里的 foo/bar）
  const specifiers = node.specifiers;
  if (specifiers.length < 1) return;

  // 过滤出所有未被使用且未被忽略的成员
  const unusedSpecifiers = specifiers.filter(specifier => {
    // 只检查三类标准的 import 成员类型
    if (!IMPORT_AST_TYPES.includes(specifier.type)) return false;

    const name = specifier.local.name;
    // 匹配 ignoredMatchers 配置项，跳过忽略的变量
    const ignored = ignoredMatchers.some(pattern => pattern.test(name));
    // 若未忽略且未被使用则保留
    return !ignored && !isUsed(scope, name, sourceCode);
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
  const options = context.options || [];
  const option = options[0] || defaultOptions[0] || {};

  // 优先从 context 中获取 sourceCode（早期 ESLint 版本需兼容）
  const sourceCode = context.sourceCode ?? context.getSourceCode();
  const ignoredNames = option.ignoredNames || ['_'];

  const realOption: ReportOptions = {
    autoFix: (option.autoFix || 'always') === 'always',
    ignoredMatchers: buildIgnoredNameMatchers(ignoredNames)
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
  }
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
  defaultOptions: [
    {
      autoFix: 'always',
      ignoredNames: ['_']
    }
  ],
  create
}) as RuleDefinition;

export default { name, rule };
