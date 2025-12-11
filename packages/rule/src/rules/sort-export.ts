import { AST_NODE_TYPES } from '@typescript-eslint/types';
import {
  ESLintUtils,
  type JSONSchema,
  type TSESLint,
  type TSESTree
} from '@typescript-eslint/utils';

import { type ReportIssueFunc, type RuleDefinition } from './types';
import { getContextReportIssue } from './utils';

/**
 * 导出排序规则配置
 *
 * @property autoFix - 'always' 表示自动重排 export，'off' 仅提示不改动代码
 * @property order - 排序方向，默认 'asc'（字典序 A→Z），'desc' 可用于生成紧凑别名列表
 *
 * @example
 * ```ts
 * {
 *   autoFix: 'always',
 *   order: 'asc'
 * }
 * ```
 */
export interface SortExportOption {
  autoFix?: 'off' | 'always';
  order?: 'asc' | 'desc';
}

export type SortExportMessageIds = 'exportsNotSorted';

type ReportIssue = ReportIssueFunc<SortExportMessageIds>;

/** 内部复用的排序方向枚举，仅保留有效取值。 */
type SortOrder = 'asc' | 'desc';

/**
 * 归一化后的配置，便于核心逻辑直接使用布尔/枚举。
 * lineBreak 会根据源码实际换行符决定替换文本，避免混合 CRLF/LF。
 */
interface NormalizedOption {
  autoFix: boolean;
  order: SortOrder;
  lineBreak: string;
}

type SortableExportNode =
  | TSESTree.ExportAllDeclaration
  | TSESTree.ExportNamedDeclaration;

interface ExportEntry {
  node: SortableExportNode;
  key: string;
  start: number;
  originalIndex: number;
  text: string;
}

const DEFAULT_OPTION: Required<SortExportOption> = {
  autoFix: 'always',
  order: 'asc'
};

/**
 * 判断两个 export 节点是否可以合并（相同 from 和类型，exportKind 可以不同）
 */
const canMerge = (
  a: SortableExportNode,
  b: SortableExportNode,
  sourceCode: TSESLint.SourceCode
): boolean => {
  // 必须都是 named export 才能合并
  if (
    a.type !== AST_NODE_TYPES.ExportNamedDeclaration ||
    b.type !== AST_NODE_TYPES.ExportNamedDeclaration
  ) {
    return false;
  }

  // 必须有 source
  if (!a.source || !b.source) return false;

  // from 路径必须相同
  if (a.source.value !== b.source.value) return false;

  // exportKind 可以不同，允许合并 export type 和 export
  // 这样可以生成混合导出语句：export { value, type B, type Z }

  return true;
};

/**
 * 获取 export 的合并 key（用于分组）
 * 对于 named export，只基于模块名分组，不区分 exportKind，以支持混合类型导出
 */
const getMergeKey = (
  node: SortableExportNode,
  sourceCode: TSESLint.SourceCode
): string => {
  if (node.type !== AST_NODE_TYPES.ExportNamedDeclaration || !node.source) {
    // ExportAllDeclaration 不参与合并，使用完整的 key
    const kind = node.exportKind ?? 'value';
    return `${node.type}-${node.source?.value ?? ''}-${kind}`;
  }

  // named export 只基于模块名分组，允许合并 export type 和 export
  const moduleName = `${node.source.value}`;
  return `named-${moduleName}`;
};

/**
 * 读取 Identifier 名称，兼容 TS AST 中的 Identifier/字符串字面量。
 */
const getIdentifierName = (
  identifier: TSESTree.Identifier,
  sourceCode: TSESLint.SourceCode
) => {
  if (identifier.type === AST_NODE_TYPES.Identifier) {
    // 标准 Identifier 直接取 name，避免再次切片
    return identifier.name;
  }

  return sourceCode.text.slice(...identifier.range);
};

/**
 * 将 ExportSpecifier 转换为字符串，保留 alias 及字面量写法。
 */
const getExportedName = (
  specifier: TSESTree.ExportSpecifier,
  sourceCode: TSESLint.SourceCode
) => {
  const exported = specifier.exported;
  if (exported.type === AST_NODE_TYPES.Identifier) {
    // Identifier 的 alias/name 直接返回字符串
    return exported.name;
  }

  return sourceCode.text.slice(...exported.range);
};

/**
 * 获取 export 语句实际开始位置，必要时把紧邻的注释一起包含进来。
 */
const getEntryStart = (
  node: SortableExportNode,
  sourceCode: TSESLint.SourceCode,
  boundary: number
) => {
  const comments = sourceCode.getCommentsBefore(node);
  let currentStart = node.range[0];

  for (let i = comments.length - 1; i >= 0; i--) {
    const comment = comments[i];
    // 跨越 block 边界或出现非空白字符就停止回溯
    if (comment.range[0] < boundary) break;

    const between = sourceCode.text.slice(comment.range[1], currentStart);
    if (!/^\s*$/u.test(between)) break;

    currentStart = comment.range[0];
  }

  return currentStart;
};

/**
 * 生成排序 key：综合 export 类型（type/value）、形式（all/named）以及模块名/符号列表。
 */
const getExportKey = (
  node: SortableExportNode,
  sourceCode: TSESLint.SourceCode
) => {
  const moduleName = `${node.source?.value ?? ''}`;
  const kindPrefix = node.exportKind === 'type' ? 'type:' : 'value:';
  const formPrefix =
    node.type === AST_NODE_TYPES.ExportAllDeclaration ? 'all:' : 'named:';

  if (node.type === AST_NODE_TYPES.ExportAllDeclaration) {
    const alias = node.exported
      ? getIdentifierName(node.exported, sourceCode)
      : '';
    // export * as Foo from 'bar' 需要把 alias 纳入排序依据
    return `${kindPrefix}${formPrefix}${moduleName}|*${
      alias ? `:${alias}` : ''
    }`;
  }

  const specifiers = node.specifiers
    .map(specifier => getExportedName(specifier, sourceCode))
    .join(',');

  return `${kindPrefix}${formPrefix}${moduleName}|${specifiers}`;
};

/**
 * 生成合并后的 export 语句文本
 * 支持混合类型导出：export { value, type B, type Z } from './module'
 */
const buildMergedExportText = (
  nodes: SortableExportNode[],
  sourceCode: TSESLint.SourceCode,
  order: SortOrder
): string => {
  if (nodes.length === 0) return '';
  if (nodes.length === 1) return sourceCode.getText(nodes[0]);

  const firstNode = nodes[0];
  if (
    firstNode.type !== AST_NODE_TYPES.ExportNamedDeclaration ||
    !firstNode.source
  ) {
    // 不应该到达这里，但为了类型安全
    return sourceCode.getText(firstNode);
  }

  // 分别收集 type 和 value 的 specifiers
  const typeSpecifiers: Array<{
    specifier: TSESTree.ExportSpecifier;
    name: string;
  }> = [];
  const valueSpecifiers: Array<{
    specifier: TSESTree.ExportSpecifier;
    name: string;
  }> = [];

  for (const node of nodes) {
    if (
      node.type === AST_NODE_TYPES.ExportNamedDeclaration &&
      node.specifiers
    ) {
      const isType = node.exportKind === 'type';
      for (const specifier of node.specifiers) {
        const name = getExportedName(specifier, sourceCode);
        const entry = { specifier, name };

        if (isType) {
          // 检查是否已存在（避免重复）
          if (!typeSpecifiers.some(e => e.name === name)) {
            typeSpecifiers.push(entry);
          }
        } else {
          if (!valueSpecifiers.some(e => e.name === name)) {
            valueSpecifiers.push(entry);
          }
        }
      }
    }
  }

  // 排序 specifiers
  const sortByName = (a: { name: string }, b: { name: string }) =>
    order === 'asc'
      ? a.name.localeCompare(b.name)
      : b.name.localeCompare(a.name);

  typeSpecifiers.sort(sortByName);
  valueSpecifiers.sort(sortByName);

  // 生成 specifier 文本
  const formatSpecifier = (spec: TSESTree.ExportSpecifier) => {
    const local = spec.local;
    const exported = spec.exported;
    const localName =
      local.type === AST_NODE_TYPES.Identifier
        ? local.name
        : sourceCode.getText(local);
    const exportedName =
      exported.type === AST_NODE_TYPES.Identifier
        ? exported.name
        : sourceCode.getText(exported);

    if (localName === exportedName) {
      return exportedName;
    }
    return `${localName} as ${exportedName}`;
  };

  // 合并所有 specifiers：先 value，后 type（使用 type 前缀）
  const allSpecifierTexts: string[] = [];
  for (const { specifier } of valueSpecifiers) {
    allSpecifierTexts.push(formatSpecifier(specifier));
  }
  for (const { specifier } of typeSpecifiers) {
    allSpecifierTexts.push(`type ${formatSpecifier(specifier)}`);
  }

  const specifiersText = allSpecifierTexts.join(', ');
  const moduleName = sourceCode.getText(firstNode.source);

  // 如果只有 type，使用 export type（去掉 type 前缀）；否则使用 export（保留 type 前缀）
  if (valueSpecifiers.length === 0 && typeSpecifiers.length > 0) {
    // 去掉所有 "type " 前缀
    const typeOnlyText = specifiersText.replace(/\btype /gu, '');
    return `export type { ${typeOnlyText} } from ${moduleName};`;
  }

  return `export { ${specifiersText} } from ${moduleName};`;
};

/**
 * 将排序结果拼接为完整文本，原样复用 entry 中保存的注释+语句片段。
 */
const buildOutput = (entries: ExportEntry[], lineBreak: string) =>
  // 直接拼接缓存的文本片段，保持注释/空行原样输出
  entries.map(entry => entry.text).join(lineBreak);

/**
 * 比较两个 export entry 的顺序；若 key 相同则保持原始顺序避免抖动。
 */
const compareEntries = (a: ExportEntry, b: ExportEntry, order: SortOrder) => {
  if (a.key === b.key) {
    // key 一致时保持原始顺序，减少无意义 diff
    return a.originalIndex - b.originalIndex;
  }

  return order === 'asc'
    ? a.key.localeCompare(b.key)
    : b.key.localeCompare(a.key);
};

/**
 * 收集块内 export 的关键信息（起始位置、排序 key、原始文本等）。
 * @param nodes 块内 node 列表
 * @param boundary 块起点
 * @param sourceCode 源码对象
 */
const collectEntries = (
  nodes: SortableExportNode[],
  boundary: number,
  sourceCode: TSESLint.SourceCode
) => {
  const entries: ExportEntry[] = [];
  let previousBoundary = boundary;

  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index];
    // 计算语句真实起点，将紧邻注释也纳入排序片段
    const start = getEntryStart(node, sourceCode, previousBoundary);
    const text =
      sourceCode.text.slice(start, node.range[0]) + sourceCode.getText(node);

    entries.push({
      node,
      key: getExportKey(node, sourceCode),
      start,
      originalIndex: index,
      text
    });

    previousBoundary = node.range[1];
  }

  return entries;
};

const getSortableExport = (
  node: TSESTree.Statement
): SortableExportNode | null => {
  if (node.type === AST_NODE_TYPES.ExportAllDeclaration) {
    // 只处理 `export * from 'x'`，无 source 的语句无法排序
    return node.source ? node : null;
  }

  if (node.type === AST_NODE_TYPES.ExportNamedDeclaration) {
    if (node.declaration) return null;
    if (!node.source) return null;
    return node;
  }

  return null;
};

/**
 * 合并相同 from 的导出 entries
 */
const mergeEntries = (
  entries: ExportEntry[],
  sourceCode: TSESLint.SourceCode,
  options: NormalizedOption
): ExportEntry[] => {
  // 按 mergeKey 分组
  const groups = new Map<string, ExportEntry[]>();
  for (const entry of entries) {
    const key = getMergeKey(entry.node, sourceCode);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(entry);
  }

  const mergedEntries: ExportEntry[] = [];

  for (const [_, group] of groups) {
    if (group.length === 1) {
      // 只有一个，直接添加
      mergedEntries.push(group[0]);
    } else {
      // 检查是否可以合并（必须都是 named export 且可以合并）
      const firstNode = group[0].node;
      const canMergeAll = group.every(entry =>
        canMerge(firstNode, entry.node, sourceCode)
      );

      if (
        canMergeAll &&
        firstNode.type === AST_NODE_TYPES.ExportNamedDeclaration
      ) {
        // 可以合并，创建一个合并后的 entry
        // 分别收集 type 和 value 的 specifier 名称
        const typeNames: string[] = [];
        const valueNames: string[] = [];

        for (const entry of group) {
          if (
            entry.node.type === AST_NODE_TYPES.ExportNamedDeclaration &&
            entry.node.specifiers
          ) {
            const isType = entry.node.exportKind === 'type';
            for (const specifier of entry.node.specifiers) {
              const name = getExportedName(specifier, sourceCode);
              if (isType && !typeNames.includes(name)) {
                typeNames.push(name);
              } else if (!isType && !valueNames.includes(name)) {
                valueNames.push(name);
              }
            }
          }
        }

        // 排序
        const sortNames = (names: string[]) =>
          names.sort((a, b) =>
            options.order === 'asc' ? a.localeCompare(b) : b.localeCompare(a)
          );
        sortNames(typeNames);
        sortNames(valueNames);

        // 生成合并后的 key（用于排序）
        // 如果同时有 type 和 value，使用 value: 作为前缀（因为最终输出是 export，不是 export type）
        const moduleName = `${firstNode.source?.value ?? ''}`;
        const hasValue = valueNames.length > 0;

        const kindPrefix = hasValue ? 'value:' : 'type:';
        const allNames = hasValue ? [...valueNames, ...typeNames] : typeNames;
        const mergedKey = `${kindPrefix}named:${moduleName}|${allNames.join(
          ','
        )}`;

        const mergedExportText = buildMergedExportText(
          group.map(e => e.node),
          sourceCode,
          options.order
        );
        // 使用第一个 entry 的 start 和注释
        const firstEntry = group[0];
        // 保留第一个 entry 的前导注释和空白
        const leadingText = sourceCode.text.slice(
          firstEntry.start,
          firstNode.range[0]
        );
        const mergedText = leadingText + mergedExportText;
        mergedEntries.push({
          node: firstNode,
          key: mergedKey,
          start: firstEntry.start,
          originalIndex: firstEntry.originalIndex,
          text: mergedText
        });
      } else {
        // 不能合并，保持原样
        mergedEntries.push(...group);
      }
    }
  }

  return mergedEntries;
};

/**
 * 对连续 export 块执行排序，若发现顺序不一致则触发一次 report。
 * @param nodes 待排序的 export 节点集合
 * @param boundary 块起点，用于获取前导注释/空白
 * @param sourceCode 源码对象
 * @param options 归一化配置
 */
const sortExportBlock = (
  nodes: SortableExportNode[],
  boundary: number,
  sourceCode: TSESLint.SourceCode,
  options: NormalizedOption,
  reportIssue: ReportIssue
) => {
  const entries = collectEntries(nodes, boundary, sourceCode);
  if (entries.length < 2) return;

  // 先合并相同 from 的导出
  const mergedEntries = mergeEntries(entries, sourceCode, options);

  // 对合并后的 entries 进行排序
  const sortedEntries = [...mergedEntries].sort((a, b) =>
    compareEntries(a, b, options.order)
  );

  // 检查是否需要重新排序或合并
  // 1. 如果有合并发生（数量减少），需要修复
  // 2. 如果合并后的 entries 顺序与排序后的顺序不同，需要修复
  const hasMerging = mergedEntries.length !== entries.length;
  const needsReordering = mergedEntries.some((entry, index) => {
    const sorted = sortedEntries[index];
    if (!sorted) return true;
    // 比较 key 和 text，因为合并后 node 可能不同
    return entry.key !== sorted.key || entry.text !== sorted.text;
  });

  const needsChange = hasMerging || needsReordering;

  if (!needsChange) return;

  const blockStart = entries[0].start;
  const blockEnd = entries[entries.length - 1].node.range[1];
  const diffEntry = entries[0];

  reportIssue(
    'exportsNotSorted',
    diffEntry.node,
    options.autoFix
      ? fixer =>
          // 直接以 blockStart/blockEnd 为边界整体替换，确保注释同步更新
          fixer.replaceTextRange(
            [blockStart, blockEnd],
            buildOutput(sortedEntries, options.lineBreak)
          )
      : null,
    {
      data: {
        order: options.order
      }
    }
  );
};

/**
 * 核心排序过程：
 * 1. 遍历 Program，按连续 export 块划分分组，避免跨语句重排。
 * 2. 每个块内比较预期顺序 vs 实际顺序，若不同则整段替换。
 */
const sortExportsInProgram = (
  program: TSESTree.Program,
  sourceCode: TSESLint.SourceCode,
  options: NormalizedOption,
  reportIssue: ReportIssue
) => {
  const statements = program.body;
  let block: SortableExportNode[] = [];
  let blockBoundary = program.range[0];
  let previousEnd = program.range[0];

  const flushBlock = () => {
    if (block.length > 1) {
      // 单个 export 无需排序；大于 1 时执行块内排序
      sortExportBlock(block, blockBoundary, sourceCode, options, reportIssue);
    }
    block = [];
  };

  for (const statement of statements) {
    const sortable = getSortableExport(statement);
    if (sortable) {
      if (block.length === 0) {
        // 记录首个 export 前的位置，方便包含前导注释/空白
        blockBoundary = previousEnd;
      }
      block.push(sortable);
    } else {
      flushBlock();
    }

    previousEnd = statement.range?.[1] ?? previousEnd;
  }

  flushBlock();
};

const create: ESLintUtils.RuleCreateAndOptions<
  [SortExportOption],
  SortExportMessageIds
>['create'] = (context, defaultOptions) => {
  const option = context.options?.[0] || defaultOptions?.[0] || DEFAULT_OPTION;

  const sourceCode = context.getSourceCode();

  const realOption: NormalizedOption = {
    autoFix: (option.autoFix || 'always') === 'always',
    order: option.order === 'desc' ? 'desc' : 'asc',
    lineBreak: sourceCode.text.includes('\r\n') ? '\r\n' : '\n'
  };

  const reportIssue = getContextReportIssue(context);

  return {
    'Program:exit': node => {
      // 推迟到 Program 结束统一处理，避免在遍历过程中嵌套修改
      sortExportsInProgram(node, sourceCode, realOption, reportIssue);
    }
  };
};

const SchemaOverrideProperties: Record<string, JSONSchema.JSONSchema4> = {
  autoFix: { type: 'string', enum: ['off', 'always'] },
  order: { type: 'string', enum: ['asc', 'desc'] }
};

const name = 'sort-export';

const rule = ESLintUtils.RuleCreator(
  ruleName => `https://typescript-eslint.io/rules/${ruleName}/`
)({
  name,
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description: 'enforce sorted export declarations with configurable order'
    },
    messages: {
      exportsNotSorted:
        'Export declarations must be ordered in {{order}} order.'
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
