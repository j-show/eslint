import { AST_NODE_TYPES, AST_TOKEN_TYPES } from '@typescript-eslint/types';
import {
  ESLintUtils,
  JSONSchema,
  TSESLint,
  TSESTree
} from '@typescript-eslint/utils';

import { RuleDefinition } from './types';
import { getContextReportIssue } from './utils';

/**
 * 规则配置：
 * - autoFix：'always' 会直接删除声明，'off' 仅报告问题。
 * - ignoredNames：跳过指定变量名（常见如 '_'、'__'），便于表达“占位”语义。
 */
export interface UnusedVariableOption {
  autoFix?: 'off' | 'always';
  ignoredNames?: string[];
}

export type UnusedVariableMessageIds =
  | 'unusedSingleVariable'
  | 'unusedAllVariable';

/** 归一化后的配置，供核心逻辑直接消费布尔与白名单数组。 */
interface ReportOptions {
  autoFix: boolean;
  ignoredNames: string[];
}

const FUNC_EXPRESSION_TYPES = [
  AST_NODE_TYPES.FunctionExpression,
  AST_NODE_TYPES.ArrowFunctionExpression,
  AST_NODE_TYPES.CallExpression,
  AST_NODE_TYPES.AwaitExpression
];

/**
 * 判断声明是否绑定到了函数/表达式。
 * 对函数声明的处理更谨慎，避免把函数体一起删掉。
 */
const isNotFuncExpression = (
  node?: TSESTree.Node
): node is TSESTree.VariableDeclarator => {
  if (node?.type !== AST_NODE_TYPES.VariableDeclarator) return false;

  const initType = node.init?.type;
  if (!initType) return true;

  // 函数/调用/await 统统视为“复杂初始化”，不适合直接删除
  return !FUNC_EXPRESSION_TYPES.includes(initType);
};

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
    if (isNotFuncExpression(parent)) {
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

      // 通过 ESLint Scope API 获取该声明贡献的所有变量
      const variables = context.sourceCode.getDeclaredVariables(node);
      // `references` 包含声明本身，因此 <= 1 意味着没有被其它地方使用。
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
  }
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
  defaultOptions: [
    {
      autoFix: 'always',
      ignoredNames: ['_']
    }
  ],
  create
}) as RuleDefinition;

export default { name, rule };
