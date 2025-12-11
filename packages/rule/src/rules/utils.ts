import { rules as TSESLintRules } from '@typescript-eslint/eslint-plugin';
import { AST_NODE_TYPES } from '@typescript-eslint/types';
import { TSESLint, type TSESTree } from '@typescript-eslint/utils';

import { type ReportIssueFunc } from './types';

/** 正则表达式特殊字符集合，使用 Set 提高查找性能 */
const REGEX_SPECIAL_CHARS = new Set([
  '[',
  ']',
  '{',
  '}',
  '(',
  ')',
  '?',
  '*',
  '+',
  '|',
  '\\',
  '.'
]);

/**
 * 检查字符串是否包含正则表达式特殊字符
 *
 * @param str - 待检查的字符串
 * @returns 如果字符串包含正则特殊字符或以 ^/$ 开头/结尾，返回 true
 *
 * @example
 * ```ts
 * isRegexSpecialChar('^_') // true
 * isRegexSpecialChar('foo') // false
 * isRegexSpecialChar('foo.*bar') // true
 * ```
 */
export const isRegexSpecialChar = (str: string): boolean => {
  if (str.startsWith('^') || str.endsWith('$')) return true;

  // 使用 for...of 遍历字符串，避免 split 创建数组
  for (const char of str) {
    if (REGEX_SPECIAL_CHARS.has(char)) return true;
  }
  return false;
};

/**
 * 将字符串转换为正则表达式
 *
 * 如果字符串包含正则特殊字符，尝试将其编译为正则表达式。
 * 如果编译失败或字符串不包含特殊字符，返回 null。
 *
 * @param str - 待转换的字符串
 * @returns 成功时返回 RegExp 对象，失败时返回 null
 *
 * @example
 * ```ts
 * stringToRegExp('^_') // RegExp(/^_/)
 * stringToRegExp('foo') // null
 * stringToRegExp('[invalid') // null (语法错误)
 * ```
 */
export const stringToRegExp = (str: string): RegExp | null => {
  if (!isRegexSpecialChar(str)) return null;

  try {
    return new RegExp(str);
  } catch {
    // 如果正则表达式无效，返回 null，使用精确匹配
    return null;
  }
};

/**
 * 检查变量名是否匹配忽略规则
 *
 * 支持字符串精确匹配或正则表达式匹配。常用于忽略特定命名模式的变量，
 * 如下划线开头的占位变量（如 `_`、`_unused`）。
 *
 * @param name - 待检查的变量名
 * @param ignores - 忽略模式列表，可以是字符串或正则表达式
 * @returns 如果变量名匹配任一忽略模式，返回 true
 *
 * @example
 * ```ts
 * isIgnoredName('_', ['^_']) // true
 * isIgnoredName('foo', ['^_']) // false
 * isIgnoredName('_unused', [/^_/]) // true
 * ```
 */
export const isIgnoredName = (
  name: string,
  ignores: Array<string | RegExp>
): boolean => {
  return ignores.some(pattern => {
    if (typeof pattern === 'string') return pattern === name;
    return pattern.test(name);
  });
};

/**
 * 成员名的分类，方便在报错时决定最终展示形式。
 * - Private：私有字段（形如 #foo），直接带上 # 前缀
 * - Quoted：字面量中包含特殊字符，使用引号包裹
 * - Normal：普通标识符/字面量，可直接输出
 * - Expression：计算属性，保留表达式原文
 */
enum MemberNameType {
  Private = 1,
  Quoted = 2,
  Normal = 3,
  Expression = 4
}

/**
 * 从类成员节点中提取可读名称
 *
 * 尝试从各种成员节点上抽出可读名称，用于错误提示。
 * 同时会保留 Private/Computed 等特殊写法，避免误报。
 *
 * @param member - 类成员节点，支持方法、属性、访问器等
 * @param sourceCode - 源码访问对象，用于获取计算属性的原始文本
 * @returns 返回成员名称类型和名称字符串
 *
 * @example
 * ```ts
 * // class MyClass { #privateField = 1; }
 * getNameFromMember(node, sourceCode)
 * // { type: MemberNameType.Private, name: '#privateField' }
 *
 * // class MyClass { ['computed']() {} }
 * getNameFromMember(node, sourceCode)
 * // { type: MemberNameType.Expression, name: "['computed']" }
 * ```
 */
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
  // 优先判断 Identifier，保持常规 class 成员的处理开销最小
  if (member.key.type === AST_NODE_TYPES.Identifier) {
    return {
      type: MemberNameType.Normal,
      name: member.key.name
    };
  }
  // 私有字段直接拼接 # 前缀，确保提示信息原样呈现
  if (member.key.type === AST_NODE_TYPES.PrivateIdentifier) {
    return {
      type: MemberNameType.Private,
      name: `#${member.key.name}`
    };
  }
  // 字面量成员需要考虑是否含有引号等特殊字符
  if (member.key.type === AST_NODE_TYPES.Literal) {
    const name = `${member.key.value}`;
    // if (requiresQuoting(name)) {
    if (name.includes("'")) {
      return {
        type: MemberNameType.Quoted,
        name: `"${name}"`
      };
    }

    return {
      type: MemberNameType.Normal,
      name
    };
  }

  return {
    type: MemberNameType.Expression,
    name: sourceCode.text.slice(...member.key.range)
  };
};

/**
 * 创建报告问题的辅助函数
 *
 * 简化 context.report 的调用，统一 messageId / node / fix 的签名。
 * 通过闭包把 context.report 固定在一个轻量级函数里，减少重复参数。
 *
 * @template ID - 消息 ID 类型
 * @template OPT - 规则选项类型
 *
 * @param context - ESLint 规则上下文对象
 * @returns 返回一个标准化的报告函数
 *
 * @example
 * ```ts
 * const reportIssue = getContextReportIssue(context);
 *
 * reportIssue('missingAccessibility', node, fixer => {
 *   return fixer.insertTextBefore(node, 'public ');
 * });
 * ```
 */
export const getContextReportIssue = <
  ID extends string,
  OPT extends readonly unknown[] = []
>(
  context: TSESLint.RuleContext<ID, OPT>
) => {
  // 通过闭包把 context.report 固定在一个轻量级函数里，减少重复参数
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

/**
 * 获取已有规则的监听器
 *
 * 尝试复用 @typescript-eslint 已有规则的 listener。
 * 主要用于在插件内消费官方规则时保留原有逻辑。
 *
 * @template ID - 消息 ID 类型
 * @template OPT - 规则选项类型
 *
 * @param name - 规则名称，如 '@typescript-eslint/no-unused-vars'
 * @param context - ESLint 规则上下文对象
 * @returns 返回规则的 AST 监听器对象，如果规则不存在则返回空对象
 *
 * @example
 * ```ts
 * const listener = getRuleListener('@typescript-eslint/no-unused-vars', context);
 * return {
 *   ...listener,
 *   VariableDeclaration: node => {
 *     // 自定义逻辑
 *   }
 * };
 * ```
 */
export const getRuleListener = <
  ID extends string,
  OPT extends readonly unknown[]
>(
  name: string,
  context: TSESLint.RuleContext<ID, OPT>
) => {
  // 优先从 @typescript-eslint/eslint-plugin 中直接读取规则实现
  const ruleModule = TSESLintRules[name] as unknown as
    | TSESLint.RuleModule<ID, OPT>
    | undefined;

  if (ruleModule) {
    return ruleModule.create(context);
  }

  // 插件包未命中时 fallback 到 ESLint 注册表，保持兼容性
  try {
    const fallbackRule = new TSESLint.Linter()
      .getRules()
      .get(name) as unknown as TSESLint.RuleModule<ID, OPT> | undefined;
    return fallbackRule?.create(context) ?? {};
  } catch {
    return {};
  }
};
