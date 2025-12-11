<p align="center">
  <a href="https://jshow.org" target="_blank">
    <img width="100" src="https://jshow.org/images/jshow.png" alt="jShow logo" />
  </a>
</p>

<h1 align="center">jshow-eslint</h1>

<p align="center">
  <a href="./README.md">English</a> | 简体中文
</p>

---

## 概览

`jshow-eslint` 是 jShow 团队维护的 ESLint 单体仓库，提供：

- `eslint-config-jshow`：高度定制的 Flat Config 预设，集成自研插件并按运行时拆分不同风味。
- `eslint-plugin-jshow`：涵盖显式访问修饰符、导入/导出排序与未使用代码清理的规则集。
- `examples/react` 与 `examples/vue`：真实项目示例，用于展示与回归每个预设。

仓库使用 PNPM workspace 管理，借助 Vite 构建脚本生成 `dist/` 产物。

---

## 核心包

| Package | 说明 |
| --- | --- |
| [`packages/config`](./packages/config) | Flat Config 入口，内置 TypeScript、Browser、Node、React、Vue 预设，并自动启用 `eslint-plugin-jshow`、Prettier 对齐、自研 `jshow/sort-import` / `jshow/sort-export` 以及未使用导入/变量策略。 |
| [`packages/rule`](./packages/rule) | 自研 ESLint 插件，提供 `explicit-member-accessibility`、`sort-export`、`sort-import`、`unused-import`、`unused-variable` 五条规则及安全的自动修复。 |

## 可用规则

### `jshow/explicit-member-accessibility`

要求类成员和方法显式声明访问修饰符。支持自动修复，可配置默认修饰符。

**配置选项：**
- `accessibility`: `'off' | 'explicit' | 'no-public'` - 全局访问修饰符策略
- `fixWith`: `'public' | 'protected' | 'private'` - 自动修复时使用的默认修饰符
- `ignoredNames`: `string[]` - 要忽略的成员名称列表
- `staticAccessibility`: `'off' | 'explicit' | 'no-accessibility'` - 静态成员的策略
- `overrides`: 对象，可按成员类型（constructors、methods、properties 等）单独配置

### `jshow/sort-import`

强制导入语句按配置的分组和间距排序。

**配置选项：**
- `autoFix`: `'off' | 'always'` - 是否启用自动排序
- `order`: `'asc' | 'desc'` - 组内排序方向
- `groups`: `string[][]` - 正则表达式数组，用于分组导入
- `clusters`: `number[]` - 每个分组的间距策略（0=紧凑，1=每行后空一行，2=每行前后各空一行）

### `jshow/sort-export`

强制导出语句按配置的顺序排序。

**配置选项：**
- `autoFix`: `'off' | 'always'` - 是否启用自动排序
- `order`: `'asc' | 'desc'` - 排序方向

### `jshow/unused-import`

检测并移除未使用的导入。支持 JSDoc 引用检查。

**配置选项：**
- `autoFix`: `'off' | 'always'` - 是否启用自动移除（默认：`'always'`）
- `ignoredNames`: `string[]` - 要忽略的模式（支持正则表达式字符串，如 `'^_'`）。默认：`['^_']`
- `ignoreJSDoc`: `boolean` - 是否忽略 JSDoc 中的引用（默认：`true`）

### `jshow/unused-variable`

检测并移除未使用的变量声明，包括解构绑定。修复器会智能地删除最小必要范围，确保代码语法仍然有效。

**配置选项：**
- `autoFix`: `'off' | 'always'` - 是否启用自动移除（默认：`'always'`）
- `ignoredNames`: `string[]` - 要忽略的模式（支持正则表达式字符串，如 `'^_'`）。默认：`['^_']`
- `ignoreFunction`: `boolean` - 是否忽略函数变量（默认：`true`）。注意：解构变量无论此选项如何设置都会被检查。

---

## 为什么选择 jshow-eslint？

- **实战默认值**：在 `@eslint/js`、`@typescript-eslint` 与 Prettier 之上叠加团队经验。
- **多运行时覆盖**：一次安装即可兼容浏览器、Node.js、React、Vue，保持统一的命名与 import/export 排序。
- **插件即服务**：`eslint-plugin-jshow` 随配置自动加载，无需额外版本管理。
- **示例驱动**：React/Vue 示例在 CI 中执行，确保发布时的真实体验。
- **现代工具链**：面向 ESLint 9 Flat Config，借 `FlatCompat` 兼容传统插件生态。
- **性能优化**：规则实现注重性能，使用 `Set` 实现 O(1) 查找，适合大型代码库。
- **文档完善**：提供详细的 JSDoc 注释和中英文 README 文档。

---

## 快速上手

1. **安装依赖**

   ```bash
   pnpm add -D eslint eslint-config-jshow eslint-plugin-jshow
   ```

2. **创建 `eslint.config.js`**

   ```js
   import reactConfig from 'eslint-config-jshow/react';

   export default [...reactConfig];
   ```

   将 `react` 替换为 `browser`、`node`、`vue` 或默认的 TypeScript 预设即可。

   **可用预设：**
   - `eslint-config-jshow/typescript` - TypeScript 基础配置
   - `eslint-config-jshow/browser` - 浏览器环境（基于 typescript）
   - `eslint-config-jshow/node` - Node.js 环境（基于 typescript）
   - `eslint-config-jshow/react` - React 应用（基于 browser）
   - `eslint-config-jshow/vue` - Vue 3 应用（基于 browser）

3. **运行 ESLint**

   ```bash
   pnpm exec eslint . --report-unused-disable-directives --max-warnings=0
   ```

## 配置示例

### TypeScript 项目

```js
import typescriptConfig from 'eslint-config-jshow/typescript';

export default [...typescriptConfig];
```

### React 项目

```js
import reactConfig from 'eslint-config-jshow/react';

export default [...reactConfig];
```

### Vue 项目

```js
import vueConfig from 'eslint-config-jshow/vue';

export default [...vueConfig];
```

### 自定义配置

```js
import typescriptConfig from 'eslint-config-jshow/typescript';

export default [
  ...typescriptConfig,
  {
    rules: {
      'jshow/sort-import': [
        'error',
        {
          groups: [
            ['^node:'],
            ['^@?[a-zA-Z]'],
            ['^@/'],
            ['^\\.\\./'],
            ['^\\./']
          ]
        }
      ]
    }
  }
];
```

---

## 仓库脚本

| 命令 | 说明 |
| --- | --- |
| `pnpm build` | 清理旧产物后依次构建 `eslint-plugin-jshow` 与 `eslint-config-jshow`。 |
| `pnpm build:rule` / `pnpm build:config` | 在指定包内运行 `vite build`，输出到 `packages/*/dist`。 |
| `pnpm test:rule` | 使用 Vitest RuleTester 套件验证插件规则。 |
| `pnpm test:react` / `pnpm test:vue` | 在示例应用中执行 ESLint。 |
| `pnpm preview:react` / `pnpm preview:vue` | 启动示例项目的 Vite 开发服务器进行手动验证。 |

---

## 示例项目

- `examples/react`：井字棋 Demo，聚焦 React + TypeScript + JSX 规则行为。
- `examples/vue`：Vue 3 `<script setup>` Demo，强调组合式 API 与 Vue 特定全局。

它们都直接依赖本地构建，可通过 `pnpm preview:*` 或 `pnpm test:*` 进行验证。

---

## 开发流程

1. `pnpm install`
2. 在 `packages/config` 或 `packages/rule` 中修改源码。
3. `pnpm build` 生成最新 `dist/`。
4. `pnpm test:rule`、`pnpm test:react`、`pnpm test:vue` 验证规则与配置。
5. 根据需要在 `examples/` 中添加额外场景。

---

## 目录结构

```
├── packages/
│   ├── config/   # eslint-config-jshow
│   └── rule/     # eslint-plugin-jshow
├── scripts/      # 构建脚本与工具
├── examples/     # React/Vue 示例
├── dist/         # 构建输出（已忽略）
├── eslint.config.js
├── pnpm-workspace.yaml
└── ...
```

---

## 许可证

[MIT](./LICENSE) © jShow

---

如需提问或反馈，请前往 <https://github.com/j-show/eslint/issues>。

