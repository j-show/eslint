<p align="center">
  <a href="https://jshow.org" target="_blank">
    <img width="100" src="https://jshow.org/images/jshow.png" alt="jShow logo" />
  </a>
</p>

<h1 align="center">eslint-config-jshow</h1>

<p align="center">
  <a href="./README.md">English</a> | 简体中文
</p>

---

## 概览

`eslint-config-jshow` 是 jShow 项目统一使用的 Flat Config 预设，主要特性：

- 基于 `@eslint/js`、`@typescript-eslint` 的现代 TypeScript 规则。
- 集成 `eslint-config-prettier` + `eslint-plugin-prettier`，消除格式化冲突。
- 默认挂载 `eslint-plugin-jshow`，覆盖显式访问修饰符、导入/导出排序与未使用导入/变量策略。
- 额外依赖 `eslint-plugin-unused-imports`，满足仍需 `unused-imports/*` 规则的场景。

所有入口都会导出 `Linter.Config[]`，可以直接在 `eslint.config.js` 中展开使用。

---

## 预设一览

| 导入路径 | 场景 | 内容 |
| --- | --- | --- |
| `eslint-config-jshow` | 基础 TypeScript | TypeScript 通用规则、Prettier 对齐、ES2020 + Vitest/Jest 全局、`jshow/*` 规则（含 `jshow/sort-import` / `jshow/sort-export`）、未使用导入清理。 |
| `eslint-config-jshow/browser` | 浏览器应用 | 基础预设 + 浏览器全局（`window`、`document`）、JSX 解析选项、`no-alert` 加固。 |
| `eslint-config-jshow/node` | Node.js/脚本 | 基础预设 + Node 全局、CLI 友好放宽、偏好 `node:` 内建的 `jshow/sort-import` 分组、Node 特定安全规则。 |
| `eslint-config-jshow/react` | React + JSX | 浏览器预设 + `eslint-plugin-react`、`eslint-plugin-react-hooks`，自动检测 React 版本，给 JSX 量身定制的 import 分组与规则调整。 |
| `eslint-config-jshow/vue` | Vue 3 | 浏览器预设 + `eslint-plugin-vue` flat 推荐、`vue-eslint-parser`、Vue 全局与 `<script setup>` 友好的额外规则。 |

---

## 安装

```bash
pnpm add -D eslint eslint-config-jshow eslint-plugin-jshow
```

虽然预设已经依赖 `eslint-plugin-jshow`，显式安装可以保证锁文件在多 workspace 场景下更稳定。

---

## 使用方式

在仓库根目录创建 `eslint.config.js` 并展开需要的预设：

```js
// eslint.config.js
import tsPreset from 'eslint-config-jshow';

export default [...tsPreset];
```

### 浏览器 / React / Vue

```js
import reactPreset from 'eslint-config-jshow/react';

export default [
  ...reactPreset,
  {
    // 自定义规则
    settings: { 'import/resolver': { typescript: true } },
    rules: {
      'react/jsx-max-depth': ['warn', { max: 6 }]
    }
  }
];
```

### Node.js 工具或脚本

```js
import nodePreset from 'eslint-config-jshow/node';

export default [
  ...nodePreset,
  {
    files: ['scripts/**/*.ts'],
    rules: {
      'no-console': 'off'
    }
  }
];
```

### Monorepo 中混合多个预设

```js
import tsPreset from 'eslint-config-jshow';
import reactPreset from 'eslint-config-jshow/react';
import nodePreset from 'eslint-config-jshow/node';

export default [
  ...tsPreset,
  ...reactPreset.map(cfg => ({
    ...cfg,
    files: ['apps/web/**/*.{ts,tsx}']
  })),
  ...nodePreset.map(cfg => ({
    ...cfg,
    files: ['packages/scripts/**/*.ts']
  }))
];
```

> 提示：每个预设都是数组，可以多次展开并搭配不同的 `files` 进行作用域划分，非常适合大型仓库。

---

## 推荐脚本

```jsonc
{
  "scripts": {
    "lint": "eslint . --report-unused-disable-directives --max-warnings=0",
    "lint:fix": "pnpm run lint -- --fix"
  }
}
```

---

## 本地开发

1. 在仓库根目录执行 `pnpm install`。
2. 修改 `packages/config/src` 下的配置源码。
3. 运行 `pnpm -F eslint-config-jshow build`（或 `pnpm build:config`）生成新的 `dist/`。
4. 使用 `examples/react`、`examples/vue` 做手动验证。

---

## 许可证

[MIT](../../LICENSE) © jShow

