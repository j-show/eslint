import { AST_NODE_TYPES, AST_TOKEN_TYPES } from '@typescript-eslint/types';
import {
  ESLintUtils,
  type JSONSchema,
  type TSESLint,
  type TSESTree
} from '@typescript-eslint/utils';

import { type RuleDefinition } from './types';
import { getContextReportIssue, isIgnoredName, stringToRegExp } from './utils';

/**
 * 未使用变量规则配置
 *
 * @property autoFix - 'always' 会直接删除声明，'off' 仅报告问题
 * @property ignoredNames - 跳过指定变量名（常见如 '_'、'__'），便于表达"占位"语义
 * @property ignoreFunction - 是否忽略变量是函数的情况，默认为 true
 *
 * @example
 * ```ts
 * {
 *   autoFix: 'always',
 *   ignoredNames: ['^_', '^unused'],
 *   ignoreFunction: true
 * }
 * ```
 */
export interface UnusedVariableOption {
  autoFix?: 'off' | 'always';
  ignoredNames?: string[];
  ignoreFunction?: boolean;
}

export type UnusedVariableMessageIds =
  | 'unusedSingleVariable'
  | 'unusedAllVariable';

/** 归一化后的配置，供核心逻辑直接消费布尔与白名单数组。 */
interface ReportOptions {
  autoFix: boolean;
  ignoredNames: Array<string | RegExp>;
  ignoreFunction: boolean;
}

const DEFAULT_OPTION: Required<UnusedVariableOption> = {
  autoFix: 'always',
  ignoredNames: ['^_'],
  ignoreFunction: true
};

/** 函数表达式类型集合，用于判断变量初始化是否为函数表达式 */
const FUNC_EXPRESSION_TYPES = new Set([
  AST_NODE_TYPES.FunctionExpression,
  AST_NODE_TYPES.ArrowFunctionExpression,
  AST_NODE_TYPES.CallExpression,
  AST_NODE_TYPES.AwaitExpression
]);

/**
 * 判断声明是否绑定到了函数/表达式。
 * 对函数声明的处理更谨慎，避免把函数体一起删掉。
 *
 * @param node - 待检查的 AST 节点
 * @returns 如果节点是 VariableDeclarator 且初始化不是函数表达式，返回 true
 */
const isNotFuncExpression = (
  node?: TSESTree.Node
): node is TSESTree.VariableDeclarator => {
  if (node?.type !== AST_NODE_TYPES.VariableDeclarator) return false;

  const initType = node.init?.type;
  if (!initType) return true;

  // 函数/调用/await 统统视为"复杂初始化"，不适合直接删除
  return !FUNC_EXPRESSION_TYPES.has(initType);
};

/**
 * 判断节点是否为逗号标点符号
 *
 * @param node - 待检查的节点
 * @returns 如果是逗号标点符号，返回 true
 */
const isPunctuatorComma = (
  node?: unknown
): node is TSESTree.PunctuatorToken => {
  const token = node as TSESTree.Token | undefined;
  // 只要是逗号标点就返回 true，方便后续统一处理
  return token?.type === AST_TOKEN_TYPES.Punctuator && token.value === ',';
};

type NumberRange = [number, number];

/**
 * 根据已经移除的字符索引动态调整 range，避免 fixer 重复覆盖。
 *
 * @param range - 原始字符范围 [start, end]
 * @param removedIndex - 已移除字符索引的集合
 * @returns 调整后的字符范围
 */
const formatRange = (
  range: NumberRange,
  removedIndex: Set<number>
): NumberRange => {
  const result: NumberRange = [range[0], range[1]];

  for (let i = range[0]; i <= range[1]; i++) {
    if (removedIndex.has(i)) continue;
    // 找到第一个尚未删除的起点
    result[0] = i;
    break;
  }

  for (let i = range[1]; i >= result[0]; i--) {
    if (removedIndex.has(i)) continue;
    // 同理收缩尾部，避免覆盖已有 fix
    result[1] = i;
    break;
  }

  for (let i = result[0]; i <= result[1]; i++) removedIndex.add(i);

  return result;
};

/**
 * 删除变量声明时，需要同时处理逗号或紧邻的 token，
 * 尽可能保持语句仍然合法。
 *
 * @param o - ESLint 规则修复器
 * @param code - 源码访问对象
 * @param node - 要删除的节点
 * @param removedIndex - 已移除字符索引的集合，用于避免重复修复
 * @returns 修复操作
 */
const removePunctuatorRange = (
  o: TSESLint.RuleFixer,
  code: TSESLint.SourceCode,
  node: TSESTree.Node,
  removedIndex: Set<number>
) => {
  const prevToken = code.getTokenBefore(node);
  const nextToken = code.getTokenAfter(node);

  const isLast = !nextToken || nextToken.type !== AST_TOKEN_TYPES.Identifier;

  let range: NumberRange | null = [node.range[0], node.range[1]];

  if (isPunctuatorComma(nextToken)) {
    // 位于中间：连同后面的逗号一起删掉
    range[1] = nextToken.range[1];
  } else if (isLast && isPunctuatorComma(prevToken)) {
    // 位于末尾：删除前面的逗号
    range[0] = prevToken.range[0];
  } else {
    // 其它场景直接删节点即可
    return o.remove(node);
  }

  range = formatRange(range, removedIndex);

  return o.removeRange(range);
};

/**
 * 生成针对单个变量/解构项的 fixer。
 * 优先删除包含该变量的 declarator，若不是纯 declarator 再 fallback 到 identifier。
 *
 * @param code - 源码访问对象
 * @param realOption - 归一化后的规则配置
 * @param node - 变量标识符节点
 * @param removedIndex - 已移除字符索引的集合
 * @returns 修复函数，如果 autoFix 为 false 则返回 null
 */
const fixVariableDeclarator = (
  code: TSESLint.SourceCode,
  realOption: ReportOptions,
  node: TSESTree.Node,
  removedIndex: Set<number>
): TSESLint.ReportFixFunction | null => {
  if (!realOption.autoFix) return null;

  return o => {
    const parent = node.parent;
    // 当 ignoreFunction 为 false 时，即使 isNotFuncExpression 为 false，也应该删除整个 declarator
    if (parent && (isNotFuncExpression(parent) || !realOption.ignoreFunction)) {
      // 优先删除包含该变量的 declarator，避免留下孤立的 =
      return removePunctuatorRange(o, code, parent, removedIndex);
    }

    // 否则退化为只删除 Identifier，自行处理逗号
    return removePunctuatorRange(o, code, node, removedIndex);
  };
};

/**
 * rule.create：扫描所有 VariableDeclaration，过滤导出语句，避免误删公共接口。
 * 每个声明会通过 ESLint 的变量解析结果判断引用次数。
 */
const create: ESLintUtils.RuleCreateAndOptions<
  [UnusedVariableOption],
  UnusedVariableMessageIds
>['create'] = (context, defaultOptions) => {
  const option = context.options?.[0] || defaultOptions?.[0] || DEFAULT_OPTION;

  const realOption: ReportOptions = {
    autoFix: (option.autoFix || DEFAULT_OPTION.autoFix) === 'always',
    ignoredNames: (option.ignoredNames || DEFAULT_OPTION.ignoredNames).map(
      name => stringToRegExp(name) ?? name
    ),
    ignoreFunction: option.ignoreFunction ?? DEFAULT_OPTION.ignoreFunction
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

      // 通过 ESLint Scope API 获取该声明贡献的所有变量
      const variables = context.sourceCode.getDeclaredVariables(node);
      // `references` 包含声明本身，因此 <= 1 意味着没有被其它地方使用。
      const unusedVars = variables.filter(variable => {
        // 如果变量在忽略列表中，跳过（支持字符串精确匹配和正则表达式匹配）
        if (isIgnoredName(variable.name, realOption.ignoredNames)) {
          return false;
        }
        // 如果变量被使用了，跳过
        if (variable.references.length > 1) {
          return false;
        }
        // 如果变量是函数声明，根据 ignoreFunction 配置决定是否忽略（但不包括解构赋值）
        const identifier = variable.identifiers[0];
        if (!identifier) return true;

        // 检查是否在解构模式中
        let current: TSESTree.Node | undefined = identifier.parent;
        let inDestructuring = false;

        while (current) {
          // 如果在解构模式中，即使右侧是函数调用也应该检测
          if (
            current.type === AST_NODE_TYPES.ObjectPattern ||
            current.type === AST_NODE_TYPES.ArrayPattern
          ) {
            inDestructuring = true;
            break;
          }
          // 找到对应的 declarator
          if (current.type === AST_NODE_TYPES.VariableDeclarator) {
            // 如果不在解构模式中，且 init 是函数表达式
            if (!inDestructuring && !isNotFuncExpression(current)) {
              // 如果配置了 ignoreFunction，则忽略函数类型的变量
              if (realOption.ignoreFunction) {
                return false;
              }
            }
            break;
          }
          current = current.parent;
        }
        return true;
      });

      if (unusedVars.length < 1) return;

      if (unusedVars.length === variables.length) {
        // 当 ignoreFunction 为 false 时，即使包含函数表达式也应该能够删除整个声明
        const isNormalOrNonFunctionDeclaration = realOption.ignoreFunction
          ? node.declarations.every(isNotFuncExpression)
          : true;

        if (isNormalOrNonFunctionDeclaration) {
          reportIssue(
            unusedVars.length > 1
              ? 'unusedAllVariable'
              : 'unusedSingleVariable',
            node,
            realOption.autoFix
              ? o => {
                  // 获取节点后的 token（跳过注释）
                  const afterNode = sourceCode.getTokenAfter(node, {
                    includeComments: false
                  });
                  if (afterNode?.range) {
                    // 如果下一个 token 在同一行，删除节点及其后的空白字符
                    if (afterNode.loc.start.line === node.loc.end.line) {
                      return o.removeRange([node.range[0], afterNode.range[0]]);
                    }
                    // 如果下一个 token 在不同行，只删除节点本身（保留换行）
                    return o.remove(node);
                  }
                  // 如果没有下一个 token，检查是否是文件末尾或只有空白
                  const textAfter = sourceCode.text.slice(node.range[1]);
                  const whitespaceMatch = /^\s*$/.exec(textAfter);
                  if (whitespaceMatch) {
                    // 如果后面只有空白字符，删除节点及其后的空白
                    return o.removeRange([
                      node.range[0],
                      node.range[1] + whitespaceMatch[0].length
                    ]);
                  }
                  // 否则只删除节点本身
                  return o.remove(node);
                }
              : null,
            { data: { names: variables.map(o => o.name).join(', ') } }
          );
          return;
        }
      }

      // 记录已经被移除的字符索引，防止多个变量共享同一段代码时出现重叠 fix。
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

const SchemaOverrideProperties: Record<string, JSONSchema.JSONSchema4> = {
  autoFix: { type: 'string', enum: ['off', 'always'] },
  ignoredNames: {
    type: 'array',
    items: {
      type: 'string'
    }
  },
  ignoreFunction: { type: 'boolean' }
};

const name = 'unused-variable';

/**
 * 这是一个 eslint 插件规则。
 * 用于检测/移除未被使用的变量声明，并尽量收缩到语句粒度，减少手动清理。
 */
const rule = ESLintUtils.RuleCreator(
  ruleName => `https://typescript-eslint.io/rules/${ruleName}/`
)({
  name,
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description: 'disallow unused variables'
    },
    messages: {
      unusedSingleVariable: 'Unused variable detected: {{names}}',
      unusedAllVariable: 'All Variables is unused: {{names}}'
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
