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
 * - autoFix：'always' 表示自动重排 export，'off' 仅提示不改动代码。
 * - order：排序方向，默认 asc（字典序 A→Z），desc 可用于生成紧凑别名列表。
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
 * 将排序结果拼接为完整文本，原样复用 entry 中保存的注释+语句片段。
 */
const buildOutput = (entries: ExportEntry[], lineBreak: string) =>
  // 直接拼接缓存的文本片段，保持注释/空行原样输出
  entries.map(entry => entry.text).join(lineBreak);

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
    if (!/^\s*$/.test(between)) break;

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

  const sortedEntries = [...entries].sort((a, b) =>
    compareEntries(a, b, options.order)
  );

  // 逐个比较节点引用，只有顺序不同才需要触发 report/fix
  const needsReorder = entries.some(
    (entry, index) => entry.node !== sortedEntries[index]?.node
  );
  if (!needsReorder) return;

  const blockStart = entries[0].start;
  const blockEnd = entries[entries.length - 1].node.range[1];
  const diffEntry =
    entries.find((entry, index) => entry.node !== sortedEntries[index]?.node) ??
    entries[0];

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
  const option = (context.options?.[0] ||
    defaultOptions?.[0] ||
    DEFAULT_OPTION) as SortExportOption;

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
