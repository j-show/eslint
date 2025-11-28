import { rules as TSESLintRules } from '@typescript-eslint/eslint-plugin';
import { AST_NODE_TYPES } from '@typescript-eslint/types';
import { TSESLint, TSESTree } from '@typescript-eslint/utils';

import { ReportIssueFunc } from './types';

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
 * 尝试从各种成员节点上抽出可读名称，用于错误提示。
 * 同时会保留 Private/Computed 等特殊写法，避免误报。
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
 * 简化 context.report 的调用，统一 messageId / node / fix 的签名。
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
 * 尝试复用 @typescript-eslint 已有规则的 listener。
 * 主要用于在插件内消费官方规则时保留原有逻辑。
 */
export const getRuleListener = <
  ID extends string,
  OPT extends readonly unknown[]
>(
  name: string,
  context: TSESLint.RuleContext<ID, OPT>
) => {
  let ruleModule: TSESLint.RuleModule<ID, OPT>;

  try {
    // 优先从 @typescript-eslint/eslint-plugin 中直接读取规则实现
    ruleModule = TSESLintRules[name] as unknown as TSESLint.RuleModule<ID, OPT>;
  } catch {
    // 插件包未命中时 fallback 到 ESLint 注册表，保持兼容性
    ruleModule = new TSESLint.Linter()
      .getRules()
      .get(name) as unknown as TSESLint.RuleModule<ID, OPT>;
  }

  return ruleModule?.create(context) ?? {};
};
