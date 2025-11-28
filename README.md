<p align="center">
  <a href="https://jshow.org" target="_blank">
    <img width="100" src="https://jshow.org/images/jshow.png" alt="jShow logo" />
  </a>
</p>

<h1 align="center">jshow-eslint</h1>

<p align="center">
  English | <a href="./README_CN.md">简体中文</a>
</p>

---

## Overview

`jshow-eslint` is the official ESLint monorepo maintained by the jShow team. It ships:

- `eslint-config-jshow`: a heavily curated Flat Config preset with custom plugins and runtime-specific flavors.
- `eslint-plugin-jshow`: companion rules that enforce explicit member accessibility, deterministic import/export ordering, and aggressive unused-code cleanup.
- `examples/react` & `examples/vue`: real projects that showcase and regression-test every preset.

The repository is managed with PNPM workspaces and builds through Vite-powered scripts that emit distributable artifacts into `dist/`.

---

## Package Highlights

| Package | Description |
| --- | --- |
| [`packages/config`](./packages/config) | Flat Config entry point with TypeScript, Browser, Node, React, and Vue presets. Automatically wires `eslint-plugin-jshow`, Prettier alignment, the in-house `jshow/sort-import` / `jshow/sort-export` rules, and unused import/variable policies. |
| [`packages/rule`](./packages/rule) | Custom ESLint plugin that provides `explicit-member-accessibility`, `sort-export`, `sort-import`, `unused-import`, and `unused-variable`, each with safe autofixers. |

---

## Why jshow-eslint?

- **Battle-tested defaults** – Extends `@eslint/js`, `@typescript-eslint`, and Prettier recommendations plus jShow's internal conventions.
- **Multi-runtime coverage** – One dependency configures browser, Node.js, React, and Vue projects while keeping naming plus import/export order consistent.
- **Plugin included** – `eslint-plugin-jshow` is bundled automatically, so consumers don't manage extra dependencies or versions.
- **Example-driven** – The React/Vue demos run in CI to validate every release of the presets.
- **Modern tooling** – Built for ESLint 9 Flat Config and powered by `FlatCompat` for smooth interop with legacy plugins.

---

## Quick Start

1. **Install dependencies**

   ```bash
   pnpm add -D eslint eslint-config-jshow eslint-plugin-jshow
   ```

2. **Create `eslint.config.js`**

   ```js
   import reactConfig from 'eslint-config-jshow/react';

   export default [...reactConfig];
   ```

   Swap `react` with `browser`, `node`, `vue`, or omit the suffix to use the base TypeScript preset.

3. **Run ESLint**

   ```bash
   pnpm exec eslint . --report-unused-disable-directives --max-warnings=0
   ```

---

## Repository Scripts

| Command | Description |
| --- | --- |
| `pnpm build` | Cleans previous outputs then builds `eslint-plugin-jshow` and `eslint-config-jshow` sequentially. |
| `pnpm build:rule` / `pnpm build:config` | Runs `vite build` inside the selected package and writes bundles to `packages/*/dist`. |
| `pnpm test:rule` | Executes the Vitest-based RuleTester suite for the plugin. |
| `pnpm test:react` / `pnpm test:vue` | Lints the example applications end-to-end. |
| `pnpm preview:react` / `pnpm preview:vue` | Launches the Vite dev servers for manual validation. |

---

## Examples

- `examples/react` – A Tic-Tac-Toe style React + TypeScript app that stresses JSX, hooks, and component patterns.
- `examples/vue` – A Vue 3 `<script setup>` demo that validates composition-API behavior and Vue-specific globals.

Both demos consume the local build artifacts; run `pnpm preview:*` for manual testing or `pnpm test:*` to lint inside CI.

---

## Development Workflow

1. `pnpm install`
2. Modify sources under `packages/config` or `packages/rule`.
3. `pnpm build` to refresh distributable outputs.
4. `pnpm test:rule` plus `pnpm test:react` / `pnpm test:vue` to validate the rules and presets.
5. Use the example apps for additional reproduction cases before publishing.

---

## Directory Layout

```
├── packages/
│   ├── config/   # eslint-config-jshow sources
│   └── rule/     # eslint-plugin-jshow sources
├── scripts/      # Shared build utilities
├── examples/     # React/Vue demos
├── dist/         # Build outputs (gitignored)
├── eslint.config.js
├── pnpm-workspace.yaml
└── ...
```

---

## License

[MIT](./LICENSE) © jShow

---

Questions or issues? Open an issue at <https://github.com/j-show/eslint/issues>.

