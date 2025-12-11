<p align="center">
	<a href="https://jshow.org" target="_blank">
		<img width="100" src="https://jshow.org/images/jshow.png" alt="jShow logo" />
	</a>
</p>
<h1 align="center">eslint-plugin-jshow</h1>

[![pro-ci]][pro-travisci]
[![pro-co]][pro-codecov]
[![pro-dm]][pro-npm]
[![pro-ver]][pro-npm]

[![pro-lic]][pro-npm]
[![pro-ct]][pro-chat]

[pro-github]: https://github.com/j-show/eslint-jshow
[pro-npm]: https://npmjs.com/package/eslint-plugin-jshow
[pro-chat]: https://gitter.im/j-show/eslint-plugin-jshow
[pro-travisci]: https://travis-ci.org/j-show/eslint-plugin-jshow
[pro-codecov]: https://codecov.io/github/j-show/eslint-plugin-jshow?branch=master
[pro-issue]: https://github.com/j-show/eslint-plugin-jshow/issues

[pro-ci]: https://img.shields.io/travis/j-show/eslint-plugin-jshow/master.svg
[pro-co]: https://img.shields.io/codecov/c/github/j-show/eslint-plugin-jshow/master.svg
[pro-ver]: https://img.shields.io/npm/v/eslint-plugin-jshow.svg
[pro-lic]: https://img.shields.io/npm/l/eslint-plugin-jshow.svg
[pro-dm]: https://img.shields.io/npm/dm/eslint-plugin-jshow.svg
[pro-ct]: https://img.shields.io/gitter/room/j-show/eslint-plugin-jshow.svg

<p align="center">
	<a href="./README.md">English</a> | 简体中文
</p>

---

## 赞助

jShow 是在 MIT 许可下发布的开源项目，完全依赖社区 [backers](https://github.com/j-show/jShow/blob/master/BACKERS.md) 的支持。如果你愿意帮助项目持续迭代，可以：

- [通过 Patreon 赞助](https://www.patreon.com/jshow)，资金会直接支付给维护者。
- [在 Open Collective 捐助](https://opencollective.com/jshow)，所有支出都公开透明，可用于补贴贡献者或社区活动。

### Patreon 和 Open Collective 的区别

- Patreon 资金直接进入 [eslint-plugin-jshow][pro-github] 的主要维护者账户。
- Open Collective 负责托管资金并公开报销信息，适合多人协作与活动支出。
- 两种方式都会在公开页面展示你的名称或 Logo。

---

## 概览

这个 monorepo 聚焦于提供完整的 TypeScript ESLint 体验：

- `eslint-config-jshow`：在社区最佳实践之上封装 Prettier 对齐与自研规则。
- `eslint-plugin-jshow`：实现明确访问修饰符、未使用导入、未使用变量三条规则，并提供可靠的自动修复。
- React/Vue 示例工程帮助快速验证配置效果。

---

## 仓库结构

```
├── packages/
│   ├── config/                 # eslint-config-jshow 源码
│   └── rule/                   # eslint-plugin-jshow 源码
├── scripts/                    # 通用构建脚本（ts-node）
├── examples/
│   ├── react/                  # 井字棋示例（React）
│   └── vue/                    # 井字棋示例（Vue 3）
├── dist/                       # 构建后的产物
└── ...
```

---

## 包介绍

- **`eslint-config-jshow`**  
  继承 `eslint:recommended`、`plugin:@typescript-eslint/recommended`、`prettier`、`plugin:prettier/recommended`，默认启用自研 import/export 排序规则，并提供多套场景化预设（`browser`、`node`、`react`、`vue`、`import`）。

- **`eslint-plugin-jshow`**  
  内置并导出以下规则，全部支持 autofix：
  - `explicit-member-accessibility`
  - `sort-export`
  - `sort-import`
  - `unused-import`
  - `unused-variable`

两者都通过 `ts-node` 脚本构建，并从 `dist/` 目录发布。

---

## 快速上手

### 安装依赖

```
pnpm add -D eslint eslint-plugin-jshow eslint-config-jshow
```

如果在本地仓库调试，可直接引用 `dist/` 下的相对路径。

### 配置 ESLint

在项目根目录创建 `eslint.config.js`（ESLint 9 仅加载 Flat Config）：

```js
import typescriptConfig from 'eslint-config-jshow';

export default [...typescriptConfig];
```

根据场景切换为 `eslint-config-jshow/react`、`eslint-config-jshow/vue`、`eslint-config-jshow/browser` 或 `eslint-config-jshow/node`。

### 运行 ESLint

```
pnpm exec eslint . --report-unused-disable-directives --max-warnings=0
```

---

## 脚本

| 命令 | 说明 |
| --- | --- |
| `pnpm build` | 清理旧产物，构建 `packages/rule` 与 `packages/config`，输出到 `dist/`。 |
| `pnpm test:rule` | 使用 Jest + RuleTester 运行插件测试。 |
| `pnpm preview:react` / `pnpm preview:vue` | 启动 Vite 示例工程，联调 ESLint。 |
| `pnpm test:react` / `pnpm test:vue` | 在示例项目内直接运行 ESLint。 |

每个子包也有 `npm run build`，根目录脚本会通过 `ts-node` 调用它们。

---

## 示例

`examples/react` 与 `examples/vue` 共享本地 `dist/` 中的配置与插件，可借此观察规则行为：

```
pnpm run preview:react
pnpm run test:react

pnpm run preview:vue
pnpm run test:vue
```

欢迎修改示例代码来验证更多边界。

---

## 开发流程

1. 在 `packages/rule` 或 `packages/config` 内修改源码。
2. 执行 `pnpm build` 重新生成可发布产物（会写入 `{TARGET_NAME}`/`{TARGET_VERSION}`）。
3. 运行 `pnpm test:rule` 确认规则测试通过。
4. 需要时再跑 React/Vue 示例做手动验证。

---

## 常见问题

[Issue 列表][pro-issue] 仅用于提交缺陷或功能需求，请勿在此咨询使用问题。

---

# 规则详情

## explicit-member-accessibility

该规则基于 `@typescript-eslint` 的 `explicit-member-accessibility` 思路，实现了更灵活的配置与自动修复能力，可针对类成员、访问器、构造函数以及参数属性统一检查访问修饰符。

**默认配置**

```json
{
	"plugins": ["jshow"],
	"rules": {
		"jshow/explicit-member-accessibility": [
			"error",
			{
				"accessibility": "explicit",
				"staticAccessibility": "no-accessibility",
				"fixWith": "protected",
				"overrides": {
					"constructors": "no-public"
				}
			}
		]
	}
}
```

- `accessibility`：控制是否要求属性/字段/方法/构造函数/参数属性显式声明访问级别。

	```ts
	enum Accessibility {
		"off",
		"explicit",
		"no-public"
	}
	```

- `staticAccessibility`：专门针对静态成员的策略。

	```ts
	enum StaticAccessibility {
		"off",
		"explicit",
		"no-accessibility"
	}
	```

- `fixWith`：当需要补上访问修饰符时默认使用的关键字。

	```ts
	enum FixWith {
		"private",
		"protected",
		"public"
	}
	```

- `ignoredNames`：列出需要豁免的成员名称。

- `overrides`：对不同成员类型进行额外配置

	- 可指定以下键：`constructors`、`parameterProperties`、`properties`、`accessors`、`methods`
	- 每个键既可以写成简单模式（同 `accessibility`），也可以写成带 `fixWith`/`ignoredNames` 的对象：

		```ts
		{
			accessibility: 'explicit';
			fixWith: AccessibilityFixWith;
			ignoredNames?: string[];
		}
		// 或者
		{
			accessibility: 'no-public';
			ignoredNames?: string[];
		}
		```

---

## sort-import

对齐 `eslint-plugin-simple-import-sort` 的思路，基于 `jshow` 插件原生实现，可定制导入分组与排序方式，并在分组切换时自动插入空行。

**默认配置**

```json
{
	"plugins": ["jshow"],
	"rules": {
		"jshow/sort-import": [
			"error",
			{
				"autoFix": "always",
				"order": "asc",
				"groups": [
					["^node:"],
					["^\\u0000"],
					["^@?[a-zA-Z]"],
					["^@/"],
					["^\\.\\./"],
					["^\\./"]
				],
				"clusters": [0, 0, 0, 0, 0, 0]
			}
		]
	}
}
```

- `autoFix`：`"always"`（默认）会直接重排导入语句；`"off"` 仅提示不修复。
- `order`：控制每个分组内部的排序，支持 `"asc"` 与 `"desc"`。
- `groups`：二维字符串数组，内部字符串会被当成正则依次匹配，第一个命中的分组会决定该导入的位置；未命中的导入会排在所有自定义分组之后。规则会在分组切换处插入一个空行，保持可读性。
- `clusters`：与 `groups` 一一对应，仅影响“同一分组内部”的额外空行。取值 `0/1/2` 分别表示不插空行、在当前导入下方插入 1 个空行、在当前导入上下方各插入 1 个空行，其他数值会按 `0` 处理。组与组之间始终只保留 1 个空行，若视觉簇与组切换叠加产生连续双空行会自动去掉多余的一行。

---

## sort-export

针对批量 re-export 语句（`export { ... } from '...'` / `export * as ... from '...'`）进行稳定排序，用本地规则替代 `eslint-plugin-simple-import-sort/exports`。

**默认配置**

```json
{
	"plugins": ["jshow"],
	"rules": {
		"jshow/sort-export": [
			"error",
			{
				"autoFix": "always",
				"order": "asc"
			}
		]
	}
}
```

- `autoFix`：`"always"`（默认）会自动重排导出语句，`"off"` 仅提示不修复。
- `order`：控制排序方向，`"asc"` 表示升序，`"desc"` 表示降序。

---

## unused-import

自动清理未被引用的 `import`，当整条语句的所有 specifier 都未使用时会直接删除整条语句。

**默认配置**

```json
{
	"plugins": ["jshow"],
	"rules": {
		"jshow/unused-import": [
			"warn",
			{
				"autoFix": "always",
				"ignoredNames": ["^_"],
				"ignoreJSDoc": true
			}
		]
	}
}
```

- `autoFix`：`"always"`（默认）会尝试自动移除未使用的 specifier；设为 `"off"` 时只提示不修复。
- `ignoredNames`：列出需要忽略的导入名称，支持精确字符串匹配或正则表达式模式（如 `"^_"` 匹配以下划线开头的标识符）。常用于 `_` 这类占位符。
- `ignoreJSDoc`：`true`（默认）跳过检查 JSDoc 注释中的引用。设为 `false` 时会在判断导入是否被使用时考虑 JSDoc 中的引用（如 `@link`、`@see`、`@type`）。

---

## unused-variable

定位未使用的变量声明或解构项，并尽量缩小删除范围：优先删除整个声明语句，其次是 declarator 或单个标识符，确保剩余代码语法依旧成立。

**默认配置**

```json
{
	"plugins": ["jshow"],
	"rules": {
		"jshow/unused-variable": [
			"warn",
			{
				"autoFix": "always",
				"ignoredNames": ["^_"],
				"ignoreFunction": true
			}
		]
	}
}
```

- `autoFix`：`"always"` 时直接删除对应声明，`"off"` 仅提示。
- `ignoredNames`：不会触发规则的变量名白名单，支持精确字符串匹配或正则表达式模式（如 `"^_"` 匹配以下划线开头的标识符）。默认为 `["^_"]`。
- `ignoreFunction`：`true`（默认）忽略使用函数表达式、调用表达式或 await 表达式初始化的变量。设为 `false` 时也会检查并删除未使用的函数变量。注意：解构模式中的变量无论此选项如何设置都会被检查。

---

## 许可证

[MIT](http://opensource.org/licenses/MIT)

---

**Copyright (c) 2022 jShow.org**

