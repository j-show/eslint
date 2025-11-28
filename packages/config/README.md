<p align="center">
  <a href="https://jshow.org" target="_blank">
    <img width="100" src="https://jshow.org/images/jshow.png" alt="jShow logo" />
  </a>
</p>

<h1 align="center">eslint-config-jshow</h1>

<p align="center">
  English | <a href="./README_CN.md">简体中文</a>
</p>

---

## Overview

`eslint-config-jshow` is the opinionated Flat Config preset powering every jShow project. It layers:

- `@eslint/js` + `@typescript-eslint` recommended rules for modern TypeScript.
- Prettier alignment (`eslint-config-prettier` + `eslint-plugin-prettier`) so formatting fights stay out of lint results.
- `eslint-plugin-jshow` for explicit member accessibility, deterministic import/export ordering, and unused import/variable enforcement with safe autofixes.
- `eslint-plugin-unused-imports` to keep legacy `unused-imports/*` rules available when consumers still rely on them.

All presets expose `Linter.Config[]` arrays that can be spread directly inside an `eslint.config.js`.

---

## Available presets

| Import Path | Target | Includes |
| --- | --- | --- |
| `eslint-config-jshow` | Base TypeScript | Core TypeScript rules, Prettier integration, globals for ES2020 + Vitest/Jest, `jshow/*` rules (including `jshow/sort-import` / `jshow/sort-export`), unused import removal. |
| `eslint-config-jshow/browser` | Browsers | Base TypeScript + browser globals (`window`, `document`), JSX parser options, `no-alert` hardening. |
| `eslint-config-jshow/node` | Node.js & tooling | Base TypeScript + Node globals, relaxed CLI patterns, `jshow/sort-import` groups preferring `node:` built-ins, Node-specific safety rules. |
| `eslint-config-jshow/react` | React + JSX | Browser preset + `eslint-plugin-react` + `eslint-plugin-react-hooks`, auto-detected React version, JSX-specific import groups, sensible relaxations (`react/react-in-jsx-scope` off, etc.). |
| `eslint-config-jshow/vue` | Vue 3 | Browser preset + `eslint-plugin-vue` flat recommendations, `vue-eslint-parser`, Vue globals, `<script setup>` friendly overrides. |

Each preset stays compatible with ESLint 9's Flat Config through the internal `buildCompat` helper.

---

## Installation

```bash
pnpm add -D eslint eslint-config-jshow eslint-plugin-jshow
# or npm/yarn if you prefer
```

Even though the preset already depends on `eslint-plugin-jshow`, explicitly installing it keeps your lockfile consistent across workspaces.

---

## Usage

Create `eslint.config.js` and spread whichever preset you need:

```js
// eslint.config.js
import tsPreset from 'eslint-config-jshow';

export default [...tsPreset];
```

### Browser / React / Vue apps

```js
import reactPreset from 'eslint-config-jshow/react';

export default [
  ...reactPreset,
  {
    // optional project overrides
    settings: { 'import/resolver': { typescript: true } },
    rules: {
      'react/jsx-max-depth': ['warn', { max: 6 }]
    }
  }
];
```

### Node.js packages

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

### Mixing presets in a monorepo

Different workspaces can reuse the same `eslint.config.js` by conditionally spreading presets:

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

> Tip: because every preset is an array, you can spread them multiple times with different `files` globs, which is handy for monorepos.

---

## Recommended scripts

Add these entries to your `package.json`:

```jsonc
{
  "scripts": {
    "lint": "eslint . --report-unused-disable-directives --max-warnings=0",
    "lint:fix": "npm run lint -- --fix"
  }
}
```

---

## Local development

This package is built with Vite. When hacking on the configuration itself:

1. Run `pnpm install` at the repository root.
2. Edit files under `packages/config/src`.
3. Execute `pnpm -F eslint-config-jshow build` (or `pnpm build:config` from the root) to refresh the `dist/` output.
4. Use `examples/react` and `examples/vue` to manually verify lint results.

---

## License

[MIT](../../LICENSE) © jShow

