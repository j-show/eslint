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
 * 导入排序规则配置
 *
 * @property autoFix - 是否自动修复，true 直接重排 import，false 仅提示
 * @property order - 组内排序方向，'asc' 默认按字典序 A→Z，'desc' 则反向
 * @property groups - 二维正则字符串数组，按来源划分层级，例如第三方/别名/相对路径
 * @property clusters - 与 groups 等长的数字数组，决定组内行间距（0=紧凑，1=每行后空一行，2=每行前后各空一行）
 *
 * @example
 * ```ts
 * {
 *   autoFix: true,
 *   order: 'asc',
 *   groups: [
 *     ['^node:'],
 *     ['^@?[a-zA-Z]'],
 *     ['^@/'],
 *     ['^\\.\\./'],
 *     ['^\\./']
 *   ],
 *   clusters: [0, 1, 0, 0, 0]
 * }
 * ```
 */
export interface SortImportOption {
  autoFix?: boolean;
  order?: 'asc' | 'desc';
  groups?: string[][];
  clusters?: number[];
}

export type SortImportMessageIds = 'importsNotSorted';

type ReportIssue = ReportIssueFunc<SortImportMessageIds>;

/** 内部复用的排序方向枚举，仅保留有效取值。 */
type SortOrder = 'asc' | 'desc';

/**
 * 归一化后的配置：
 * - groups 被预编译为正则，避免在遍历时频繁 new RegExp。
 * - clusters 会被填补为等长数组，保证每个分组都有对应 spacing 策略。
 * - lineBreak 会从源码推断，确保 fixer 保持原始换行风格。
 */
interface NormalizedOption {
  autoFix: boolean;
  order: SortOrder;
  groups: RegExp[][];
  clusters: number[];
  lineBreak: string;
}

/**
 * ImportEntry 记录导入语句在排序时需要的全部信息，包括：
 * - key：排序依据（来源 + 是否具名导入）
 * - groupIndex/clusterIndex：匹配到的分组信息及组内换行策略
 * - hasLeadingComment：带行注释的导入保持原位，避免破坏语义说明
 */
interface ImportEntry {
  node: TSESTree.ImportDeclaration;
  text: string;
  key: string;
  groupIndex: number;
  // visual spacing mode inside the group (0/1/2)
  clusterIndex: number;
  originalIndex: number;
  start: number;
  hasLeadingComment: boolean;
}

/**
 * DEFAULT_GROUPS 体现默认的导入层级：node 内置 → 纯副作用 → 第三方 → 别名 → 上级相对 → 当前目录，
 * 让规则在未配置时就能得到符合常见习惯的排序效果。
 */
const DEFAULT_GROUPS: string[][] = [
  ['^node:'],
  ['^\\u0000'],
  ['^@?[a-zA-Z]'],
  ['^@/'],
  ['^\\.\\./'],
  ['^\\./']
];

const DEFAULT_OPTION: Required<SortImportOption> = {
  autoFix: true,
  order: 'asc',
  groups: DEFAULT_GROUPS.map(group => [...group]),
  clusters: DEFAULT_GROUPS.map(() => 0)
};

/**
 * 若用户提供了 groups，就直接沿用；否则复制默认模板，避免在后续流程中意外修改常量。
 * @param groups 用户传入的二维正则字符串
 * @param useProvided 是否启用用户配置
 */
const normalizeGroupPatterns = (
  groups: string[][] | undefined,
  useProvided: boolean
) =>
  // 若启用了自定义 groups 则直接透传，否则复制一份默认规则
  useProvided && groups && groups.length > 0
    ? groups
    : DEFAULT_GROUPS.map(group => [...group]);

/**
 * 把用户输入的 clusters 归一化为与分组等长的数组。
 * - cluster 值只影响“同组内”导入之间的换行策略；
 * - 默认 cluster=0，表示紧凑排列。设置为 1/2 可在组内制造额外空行；
 * - 任何非法值都会被视作 0，确保整体始终可用。
 * @param clusters 用户输入的 spacing 配置
 * @param length 分组数量，用于补齐
 */
const normalizeGroupClusters = (
  clusters: number[] | undefined,
  length: number
) =>
  Array.from({ length }, (_, index) => {
    const value = clusters?.[index];
    // 只认 0/1/2，其余值统一回落到紧凑模式
    if (value === 1) return 1;
    if (value === 2) return 2;
    return 0;
  });

/**
 * 将字符串正则编译为真正的 RegExp，并过滤掉语法错误的项。
 * @param groups 已经选定的分组配置
 */
const compileGroups = (groups: string[][]): RegExp[][] =>
  groups.map(group =>
    group
      .map(pattern => {
        try {
          // 提前编译正则，捕获语法错误并以 null 方式过滤掉
          return new RegExp(pattern);
        } catch {
          return null;
        }
      })
      .filter((regex): regex is RegExp => regex !== null)
  );

/**
 * 收集紧邻 import 且位于同一块内的注释，使得排序时能连同注释整体移动。
 * @param node import 节点
 * @param sourceCode 源码对象
 * @param boundary 块的上边界，防止跨块吸收注释
 */
const collectAttachedComments = (
  node: TSESTree.ImportDeclaration,
  sourceCode: TSESLint.SourceCode,
  boundary: number
) => {
  const comments = sourceCode.getCommentsBefore(node);
  const result: TSESTree.Comment[] = [];
  let currentStart = node.range[0];

  for (let i = comments.length - 1; i >= 0; i--) {
    const comment = comments[i];
    // 超出当前块边界时停止，保证只收集同一 import 区域
    if (comment.range[0] < boundary) break;

    const between = sourceCode.text.slice(comment.range[1], currentStart);
    // 中间出现非空字符则说明注释不属于该 import
    if (!/^\s*$/u.test(between)) break;

    result.unshift(comment);
    currentStart = comment.range[0];
  }

  return result;
};

/**
 * 判断 import 前是否存在“脱离节点”的独立行注释，若存在则不参与排序。
 * @param node import 节点
 * @param sourceCode 源码对象
 * @param boundary 块边界
 */
const hasDetachedLeadingLineComment = (
  node: TSESTree.ImportDeclaration,
  sourceCode: TSESLint.SourceCode,
  boundary: number
) => {
  const comments = sourceCode.getCommentsBefore(node);
  if (comments.length < 1) return false;

  const lastComment = comments[comments.length - 1];
  if (lastComment.range[0] < boundary) {
    const between = sourceCode.text.slice(lastComment.range[1], node.range[0]);
    // 只有独立的行注释且中间只有空白才算"脱离"注释
    return lastComment.type === 'Line' && /^\s*$/u.test(between);
  }

  return false;
};

/**
 * 生成排序 key：默认按模块名排序，纯副作用 import 以 \u0000 作为前缀。
 * @param node import 节点
 */
const getSortKey = (node: TSESTree.ImportDeclaration) => {
  const sourceValue = `${node.source.value ?? ''}`;
  // 纯副作用 import 排在具名导入之前
  const prefix = node.specifiers.length < 1 ? '\u0000' : '';

  return `${prefix}${sourceValue}`;
};

/**
 * 根据排序 key 匹配所属分组；若都未命中则放到最后一组。
 * @param key 排序依据
 * @param groups 预编译的分组正则
 */
const getGroupIndex = (key: string, groups: RegExp[][]) => {
  for (let index = 0; index < groups.length; index++) {
    const group = groups[index];
    if (group.length < 1) continue;

    // 命中任意一个正则即认定为该组
    if (group.some(regex => regex.test(key))) {
      return index;
    }
  }

  return groups.length;
};

/**
 * 读取该分组的行距策略，未定义时回落到 0。
 * @param groupIndex 分组索引
 * @param clusters 行距配置
 */
const getClusterValue = (groupIndex: number, clusters: number[]) =>
  // 未配置时默认回落到 0（紧凑排列）
  clusters[groupIndex] ?? 0;

/**
 * 对两个 import 进行比较：优先按分组排序，其次按 key，最后按原始顺序。
 */
const compareEntries = (a: ImportEntry, b: ImportEntry, order: SortOrder) => {
  if (a.groupIndex !== b.groupIndex) {
    // 不同组直接按分组索引快排
    return a.groupIndex - b.groupIndex;
  }

  if (a.key === b.key) {
    // key 相同保持原始顺序，防止排序抖动
    return a.originalIndex - b.originalIndex;
  }

  return order === 'asc'
    ? a.key.localeCompare(b.key)
    : b.key.localeCompare(a.key);
};

/**
 * 将 ImportDeclaration 抽象为 ImportEntry，过程中记录注释、行首文本等信息。
 * @param nodes 所有 import 节点
 * @param sourceCode 源码对象
 * @param options 归一化配置
 */
const collectEntries = (
  nodes: TSESTree.ImportDeclaration[],
  sourceCode: TSESLint.SourceCode,
  options: NormalizedOption
) => {
  const entries: ImportEntry[] = [];
  const firstStart = nodes[0]?.range[0] ?? sourceCode.ast.range[0];
  let previousBoundary = firstStart;

  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index];
    // 计算与当前 import 紧邻的注释，必要时整体移动
    const attachedComments = collectAttachedComments(
      node,
      sourceCode,
      previousBoundary
    );
    const start = attachedComments.length
      ? attachedComments[0].range[0]
      : node.range[0];

    const prefixText = attachedComments.length
      ? sourceCode.text.slice(start, node.range[0])
      : '';
    const text = `${prefixText}${sourceCode.getText(node)}`;

    const key = getSortKey(node);
    const groupIndex = getGroupIndex(key, options.groups);
    const clusterIndex = getClusterValue(groupIndex, options.clusters);
    const hasLeadingComment =
      attachedComments.some(comment => comment.type === 'Line') ||
      hasDetachedLeadingLineComment(node, sourceCode, previousBoundary);

    entries.push({
      node,
      text,
      key,
      groupIndex,
      clusterIndex,
      originalIndex: index,
      start,
      hasLeadingComment
    });

    previousBoundary = node.range[1];
  }

  return entries;
};

/**
 * 计算相邻 import statements 之间应保留的换行数。
 * - 若跨组则固定两个换行
 * - 若同组则根据 cluster 配置和注释情况决定额外空行
 */
const getSeparatorBetween = (
  prev: ImportEntry,
  current: ImportEntry,
  lineBreak: string
) => {
  if (prev.groupIndex !== current.groupIndex) {
    // 不论 cluster 取值如何，组与组之间固定只保留一个空行
    return `${lineBreak}${lineBreak}`;
  }

  if (prev.hasLeadingComment) {
    // 上一个 import 前有独立注释时保持最小间距
    return lineBreak;
  }

  const extraAfterPrev = prev.clusterIndex >= 1 ? 1 : 0;
  const extraBeforeCurrent = current.clusterIndex >= 2 ? 1 : 0;
  const totalBreaks = 1 + extraAfterPrev + extraBeforeCurrent;

  return lineBreak.repeat(totalBreaks);
};

/**
 * 将排序后的 entries 拼接成最终文本，在不同 entry 间插入合适的分隔符。
 */
const buildOutput = (entries: ImportEntry[], lineBreak: string) => {
  if (entries.length < 1) return '';

  let output = entries[0].text;

  for (let i = 1; i < entries.length; i++) {
    const prev = entries[i - 1];
    const current = entries[i];
    // 相邻 entry 之间插入合适的换行/空行
    const separator = getSeparatorBetween(prev, current, lineBreak);
    output += `${separator}${current.text}`;
  }

  return output;
};

/**
 * Specifier 包装类型，用于跟踪类型导入信息
 */
type SpecifierWithType<
  T extends TSESTree.ImportSpecifier | TSESTree.ImportDefaultSpecifier
> = {
  spec: T;
  isType: boolean;
};

/**
 * 检查导入是否可以合并：
 * - 具名导入和默认导入可以合并
 * - 命名空间导入和纯副作用导入不能合并
 */
const canMergeImport = (node: TSESTree.ImportDeclaration): boolean => {
  // 纯副作用导入不能合并
  if (node.specifiers.length === 0) return false;

  // 检查是否有命名空间导入，有则不能合并
  const hasNamespace = node.specifiers.some(
    spec => spec.type === AST_NODE_TYPES.ImportNamespaceSpecifier
  );
  if (hasNamespace) return false;

  return true;
};

/**
 * 去重 specifiers，按本地名称去重，保留第一个出现的
 */
const deduplicateSpecifiers = <
  T extends TSESTree.ImportSpecifier | TSESTree.ImportDefaultSpecifier
>(
  specifiers: SpecifierWithType<T>[]
): Map<string, SpecifierWithType<T>> => {
  const unique = new Map<string, SpecifierWithType<T>>();
  for (const item of specifiers) {
    const localName = item.spec.local.name;
    if (!unique.has(localName)) {
      unique.set(localName, item);
    }
  }
  return unique;
};

/**
 * 收集导入节点中的所有 specifiers，区分类型导入和值导入
 */
const collectSpecifiers = (
  nodes: TSESTree.ImportDeclaration[]
): {
  defaultSpecifiers: SpecifierWithType<TSESTree.ImportDefaultSpecifier>[];
  namedSpecifiers: SpecifierWithType<TSESTree.ImportSpecifier>[];
} => {
  const defaultSpecifiers: SpecifierWithType<TSESTree.ImportDefaultSpecifier>[] =
    [];
  const namedSpecifiers: SpecifierWithType<TSESTree.ImportSpecifier>[] = [];

  for (const node of nodes) {
    const isDeclarationType = node.importKind === 'type';

    for (const spec of node.specifiers) {
      if (spec.type === AST_NODE_TYPES.ImportDefaultSpecifier) {
        defaultSpecifiers.push({
          spec,
          isType: isDeclarationType
        });
      } else if (spec.type === AST_NODE_TYPES.ImportSpecifier) {
        namedSpecifiers.push({
          spec,
          isType: spec.importKind === 'type' || isDeclarationType
        });
      }
    }
  }

  return { defaultSpecifiers, namedSpecifiers };
};

/**
 * 判断是否应该使用 import type 前缀
 */
const shouldUseTypePrefix = (
  uniqueDefaultSpecifiers: Map<
    string,
    SpecifierWithType<TSESTree.ImportDefaultSpecifier>
  >,
  uniqueNamedSpecifiers: Map<
    string,
    SpecifierWithType<TSESTree.ImportSpecifier>
  >
): boolean => {
  // 判断是否所有导入都是类型
  let allDefaultAreType = true;
  let defaultIsType = false;

  if (uniqueDefaultSpecifiers.size > 0) {
    for (const item of uniqueDefaultSpecifiers.values()) {
      if (defaultIsType === false) {
        defaultIsType = item.isType;
      }
      if (!item.isType) {
        allDefaultAreType = false;
        break;
      }
    }
  }

  let allNamedAreType = true;
  if (uniqueNamedSpecifiers.size > 0) {
    for (const item of uniqueNamedSpecifiers.values()) {
      if (!item.isType) {
        allNamedAreType = false;
        break;
      }
    }
  }

  const isAllType =
    (uniqueDefaultSpecifiers.size === 0 || allDefaultAreType) &&
    (uniqueNamedSpecifiers.size === 0 || allNamedAreType);

  // 如果默认导入是类型，即使有值导入的具名导入，也使用 import type
  return isAllType || (defaultIsType && uniqueDefaultSpecifiers.size > 0);
};

/**
 * 构建具名导入的文本部分
 */
const buildNamedSpecifiersText = (
  uniqueNamedSpecifiers: Map<
    string,
    SpecifierWithType<TSESTree.ImportSpecifier>
  >,
  useTypePrefix: boolean
): string => {
  // 分离类型导入和值导入，类型导入在前
  const typeSpecs: SpecifierWithType<TSESTree.ImportSpecifier>[] = [];
  const valueSpecs: SpecifierWithType<TSESTree.ImportSpecifier>[] = [];

  for (const entry of uniqueNamedSpecifiers.values()) {
    (entry.isType ? typeSpecs : valueSpecs).push(entry);
  }

  // 分别排序
  typeSpecs.sort((a, b) => a.spec.local.name.localeCompare(b.spec.local.name));
  valueSpecs.sort((a, b) => a.spec.local.name.localeCompare(b.spec.local.name));

  const allSpecs = [...typeSpecs, ...valueSpecs];

  return allSpecs
    .map(({ spec, isType }) => {
      const importedName =
        spec.imported.type === AST_NODE_TYPES.Identifier
          ? spec.imported.name
          : spec.imported.value;

      let specText = '';
      // 如果是类型导入且没有使用 import type 前缀，使用 inline type
      if (isType && !useTypePrefix) {
        specText += 'type ';
      }

      if (importedName !== spec.local.name) {
        specText += `${importedName} as ${spec.local.name}`;
      } else {
        specText += spec.local.name;
      }

      return specText;
    })
    .join(', ');
};

/**
 * 构建合并后的 import 语句文本
 */
const buildMergedImportText = (
  firstEntry: ImportEntry,
  uniqueDefaultSpecifiers: Map<
    string,
    SpecifierWithType<TSESTree.ImportDefaultSpecifier>
  >,
  uniqueNamedSpecifiers: Map<
    string,
    SpecifierWithType<TSESTree.ImportSpecifier>
  >,
  sourceCode: TSESLint.SourceCode
): string => {
  const sourceValue = firstEntry.node.source.value ?? '';
  const sourceText = sourceCode.getText(firstEntry.node.source);
  const quoteMatch = sourceText.match(/^(['"])/);
  const quote = quoteMatch ? quoteMatch[1] : "'";

  const useTypePrefix = shouldUseTypePrefix(
    uniqueDefaultSpecifiers,
    uniqueNamedSpecifiers
  );

  let importText = useTypePrefix ? 'import type ' : 'import ';

  // 默认导入
  if (uniqueDefaultSpecifiers.size > 0) {
    // 获取第一个默认导入（Map 的迭代顺序是插入顺序）
    const firstDefault = uniqueDefaultSpecifiers.values().next().value;
    if (firstDefault) {
      importText += firstDefault.spec.local.name;
      if (uniqueNamedSpecifiers.size > 0) {
        importText += ', ';
      }
    }
  }

  // 具名导入
  if (uniqueNamedSpecifiers.size > 0) {
    importText += '{ ';
    importText += buildNamedSpecifiersText(
      uniqueNamedSpecifiers,
      useTypePrefix
    );
    importText += ' }';
  }

  importText += ` from ${quote}${sourceValue}${quote};`;

  return importText;
};

/**
 * 合并来自同一个模块的导入语句。
 * 将多个 ImportEntry 合并为一个，生成合并后的 import 语句文本。
 */
const mergeEntriesBySource = (
  entries: ImportEntry[],
  sourceCode: TSESLint.SourceCode
): ImportEntry[] => {
  // 按模块源分组
  const sourceMap = new Map<string, ImportEntry[]>();
  const nonMergeableEntries: ImportEntry[] = [];

  for (const entry of entries) {
    const key = getSortKey(entry.node);

    // 不能合并的导入单独处理
    if (!canMergeImport(entry.node) || entry.hasLeadingComment) {
      nonMergeableEntries.push(entry);
      continue;
    }

    const group = sourceMap.get(key);
    if (group) {
      group.push(entry);
    } else {
      sourceMap.set(key, [entry]);
    }
  }

  const mergedEntries: ImportEntry[] = [];

  // 处理可以合并的导入
  for (const [, groupEntries] of sourceMap.entries()) {
    if (groupEntries.length <= 1) {
      // 只有一个导入，无需合并
      mergedEntries.push(...groupEntries);
      continue;
    }

    // 合并多个导入
    const firstEntry = groupEntries[0];
    const nodes = groupEntries.map(e => e.node);

    // 收集所有 specifiers
    const { defaultSpecifiers, namedSpecifiers } = collectSpecifiers(nodes);

    // 去重
    const uniqueDefaultSpecifiers = deduplicateSpecifiers(defaultSpecifiers);
    const uniqueNamedSpecifiers = deduplicateSpecifiers(namedSpecifiers);

    // 构建合并后的 import 语句文本
    const importText = buildMergedImportText(
      firstEntry,
      uniqueDefaultSpecifiers,
      uniqueNamedSpecifiers,
      sourceCode
    );

    // 保留第一个 entry 的注释和元数据
    const attachedComments = collectAttachedComments(
      firstEntry.node,
      sourceCode,
      firstEntry.start
    );
    const prefixText = attachedComments.length
      ? sourceCode.text.slice(
          attachedComments[0].range[0],
          firstEntry.node.range[0]
        )
      : '';

    const mergedText = `${prefixText}${importText}`;
    const mergedStart = attachedComments.length
      ? attachedComments[0].range[0]
      : firstEntry.node.range[0];

    // 创建合并后的 entry（使用第一个 node，因为我们需要一个有效的 AST 节点）
    mergedEntries.push({
      node: firstEntry.node,
      text: mergedText,
      key: firstEntry.key,
      groupIndex: firstEntry.groupIndex,
      clusterIndex: firstEntry.clusterIndex,
      originalIndex: firstEntry.originalIndex,
      start: mergedStart,
      hasLeadingComment: firstEntry.hasLeadingComment
    });
  }

  // 合并结果：先放合并后的，再放不能合并的
  // 按原始索引排序，保持相对顺序
  const allEntries = [...mergedEntries, ...nonMergeableEntries];
  allEntries.sort((a, b) => a.originalIndex - b.originalIndex);

  return allEntries;
};

/**
 * 只对不带独立注释的连续区块进行排序，确保手写注释区块保持原位。
 */
const sortEntries = (entries: ImportEntry[], order: SortOrder) => {
  const sortedEntries = [...entries];
  let cursor = 0;

  while (cursor < entries.length) {
    if (entries[cursor].hasLeadingComment) {
      sortedEntries[cursor] = entries[cursor];
      cursor += 1;
      continue;
    }

    let end = cursor;
    // 将连续的"可排序"区块挑出来，单独排序后再放回去
    while (end < entries.length && !entries[end].hasLeadingComment) {
      end += 1;
    }

    const slice = entries.slice(cursor, end);
    const sortedSlice = [...slice].sort((a, b) => compareEntries(a, b, order));

    for (let offset = 0; offset < sortedSlice.length; offset++) {
      sortedEntries[cursor + offset] = sortedSlice[offset];
    }

    cursor = end;
  }

  return sortedEntries;
};

/**
 * 核心排序流程：
 * 1. 收集所有 ImportDeclaration 并抽象成 ImportEntry。
 * 2. 按分组/排序规则生成期望文本，与当前文本对比。
 * 3. 任一差异都会在整段 import 区间内执行替换，保证换行一致。
 */
const sortImportInProgram = (
  program: TSESTree.Program,
  sourceCode: TSESLint.SourceCode,
  options: NormalizedOption,
  reportIssue: ReportIssue
) => {
  // 先筛出 ImportDeclaration，低于两个无需排序
  const importNodes = program.body.filter(
    (node): node is TSESTree.ImportDeclaration =>
      node.type === AST_NODE_TYPES.ImportDeclaration
  );

  if (importNodes.length < 2) return;

  // 将节点转换为 ImportEntry 以便比较/重排
  let entries = collectEntries(importNodes, sourceCode, options);
  if (entries.length < 2) return;

  // 记录原始 block 范围（合并前）
  const originalBlockStart = entries[0].start;
  const originalBlockEnd = entries[entries.length - 1].node.range[1];

  // 合并来自同一个模块的导入
  entries = mergeEntriesBySource(entries, sourceCode);
  if (entries.length < 1) return;

  const sortedEntries = sortEntries(entries, options.order);

  // 使用原始 block 范围，确保覆盖所有原始 import 语句
  const blockStart = originalBlockStart;
  const blockEnd = originalBlockEnd;
  const actualText = sourceCode.text.slice(blockStart, blockEnd);
  const expectedText = buildOutput(sortedEntries, options.lineBreak);

  if (actualText === expectedText) return;

  // 找到第一个不一致的 entry，以它作为报错锚点
  const diffEntryIndex = entries.findIndex(
    (entry, index) => entry.node !== sortedEntries[index]?.node
  );
  const diffEntry = diffEntryIndex >= 0 ? entries[diffEntryIndex] : entries[0];

  reportIssue(
    'importsNotSorted',
    diffEntry.node,
    options.autoFix
      ? fixer => fixer.replaceTextRange([blockStart, blockEnd], expectedText)
      : null,
    {
      data: {
        order: options.order
      }
    }
  );
};

/**
 * cluster 取值约定：
 * - 0 => 组内导入紧挨着，仅保留单个换行；
 * - 1 => 该组每条导入语句下方额外空一行；
 * - 2 => 该组每条导入语句上下都会空一行（即行首/行尾各扩充一个空行）。
 */

const create: ESLintUtils.RuleCreateAndOptions<
  [SortImportOption],
  SortImportMessageIds
>['create'] = (context, defaultOptions) => {
  /**
   * 1. 获取规则配置项，优先使用 context.options，其次 defaultOptions，最后兜底默认配置。
   * 2. 解析源码对象 sourceCode，后续需要用于文本操作与获取换行符风格。
   * 3. 判断是否有自定义分组 groups 配置，涉及导入语句分组排序；若无则用默认分组。
   * 4. 调用 normalizeGroupPatterns 处理分组字符串，避免直接改动常量 DEFAULT_GROUPS。
   * 5. 根据分组数量，归一化 clusters 参数，控制各组导入之间的视觉间隔（如空行策略）。
   * 6. 生成最终归一化配置 realOption，包括是否自动修复、排序顺序、分组正则、空行、换行符。
   * 7. 全流程只生成一次 reportIssue 函数，便于下游统一报告问题。
   * 8. 返回 AST 监听器，仅处理 Program 末尾时机（:exit），批量处理所有导入语句。
   *    - 出口统一调用 sortImportInProgram，实际完成排序主逻辑，必要时自动修复。
   */
  const option = context.options?.[0] || defaultOptions?.[0] || DEFAULT_OPTION;

  // 获取源码访问对象，后续用于操作与分析文本内容
  const sourceCode = context.getSourceCode();

  // 判断是否存在自定义 groups 配置
  const providedOption = context.options?.[0];
  const hasCustomGroups =
    Array.isArray(providedOption?.groups) && providedOption.groups.length > 0;

  // 归一化导入分组配置（二维字符串数组）
  const normalizedGroups = normalizeGroupPatterns(
    option.groups,
    hasCustomGroups
  );

  // 归一化集群空行策略，保证与分组长度等长
  const normalizedClusters = normalizeGroupClusters(
    option.clusters,
    normalizedGroups.length
  );

  // 汇总成最终使用的配置，便于排序和修复逻辑直接消费
  const realOption: NormalizedOption = {
    autoFix: option.autoFix ?? DEFAULT_OPTION.autoFix,
    order: option.order === 'desc' ? 'desc' : 'asc',
    groups: compileGroups(normalizedGroups),
    clusters: normalizedClusters,
    lineBreak: sourceCode.text.includes('\r\n') ? '\r\n' : '\n'
  };

  // 生成用于上报问题的工具函数
  const reportIssue = getContextReportIssue(context);

  // 注册退出监听器，对整个程序（Program）节点进行处理，执行自动导入排序
  return {
    'Program:exit': node => {
      sortImportInProgram(node, sourceCode, realOption, reportIssue);
    }
  };
};

const SchemaOverrideProperties: Record<string, JSONSchema.JSONSchema4> = {
  autoFix: { type: 'boolean' },
  order: { type: 'string', enum: ['asc', 'desc'] },
  groups: {
    type: 'array',
    items: {
      type: 'array',
      items: {
        type: 'string'
      }
    }
  },
  clusters: {
    type: 'array',
    items: {
      type: 'number'
    }
  }
};

const name = 'sort-import';

const rule = ESLintUtils.RuleCreator(
  ruleName => `https://typescript-eslint.io/rules/${ruleName}/`
)({
  name,
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description: 'enforce sorted import declarations with configurable groups'
    },
    messages: {
      importsNotSorted:
        'Import declarations must be grouped and sorted in {{order}} order.'
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
