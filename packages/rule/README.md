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
	English | <a href="./README_CN.md">简体中文</a>
</p>

---

## Supporting

jShow is an MIT-licensed open-source project sustained entirely by generous [backers](https://github.com/j-show/jShow/blob/master/BACKERS.md). If you would like to join them:

- [Sponsor via Patreon](https://www.patreon.com/jshow) to fund the maintainer directly.
- [Donate on Open Collective](https://opencollective.com/jshow) for transparent expense tracking that benefits contributors and community events.

### Patreon vs. Open Collective

- Patreon contributions go straight to the maintainer behind [eslint-plugin-jshow][pro-github].
- Open Collective pools funds, publishes receipts, and reimburses work or events for the broader community.
- Both options publicly acknowledge your name/logo.

---

## Overview

This monorepo delivers a full ESLint experience for TypeScript projects:

- `eslint-config-jshow` extends industry-standard presets, applies Prettier alignment, and wires the custom rules automatically.
- `eslint-plugin-jshow` provides specialized rules that enforce explicit accessibility, remove unused imports, and clean unused variables with safe autofixers.
- React/Vue example apps showcase how the configuration behaves in real projects.

---

## Repository Layout

```
├── packages/
│   ├── config/                 # eslint-config-jshow sources
│   └── rule/                   # eslint-plugin-jshow sources
├── scripts/                    # Shared build helpers (ts-node entry points)
├── examples/
│   ├── react/                  # React Tic-Tac-Toe demo using the rules
│   └── vue/                    # Vue 3 demo using the rules
├── dist/                       # Generated packages after build
└── ...
```

---

## Packages

- **`eslint-config-jshow`**  
  Extends `eslint:recommended`, `plugin:@typescript-eslint/recommended`, `prettier`, and `plugin:prettier/recommended`, wires the in-house import/export sorting rules, and exposes flavor presets (`browser`, `node`, `react`, `vue`, `import`).

- **`eslint-plugin-jshow`**  
  Ships five rules with autofix support:
  - `explicit-member-accessibility`
  - `sort-export`
  - `sort-import`
  - `unused-import`
  - `unused-variable`

Both packages are built with `ts-node` scripts and published from `dist/`.

---

## Getting Started

### Install

```
pnpm add -D eslint eslint-plugin-jshow eslint-config-jshow
```

Use relative `dist/` paths when consuming directly from the repository before publishing to npm.

### Configure ESLint

Create `eslint.config.js` (ESLint 9 only reads flat configs) and import the preset you need:

```js
import typescriptConfig from 'eslint-config-jshow';

export default [...typescriptConfig];
```

Swap the import with `eslint-config-jshow/react`, `eslint-config-jshow/vue`, `eslint-config-jshow/browser`, or `eslint-config-jshow/node` depending on the runtime.

### Run ESLint

```
pnpm exec eslint . --report-unused-disable-directives --max-warnings=0
```

---

## Scripts

| Command | Description |
| --- | --- |
| `pnpm build` | Clean existing artifacts, build `packages/rule` and `packages/config`, and write outputs to `dist/`. |
| `pnpm test:rule` | Run the Jest-based RuleTester suite for the plugin. |
| `pnpm preview:react` / `pnpm preview:vue` | Launch the Vite demos to validate lint feedback interactively. |
| `pnpm test:react` / `pnpm test:vue` | Run ESLint directly within the example projects. |

Each package also exposes `npm run build`, which the root build script invokes through `ts-node`.

---

## Examples

React and Vue demos live under `examples/` and reuse the local `dist/` artifacts:

```
pnpm run preview:react   # start Vite dev server for the React demo
pnpm run test:react      # run ESLint on the React demo

pnpm run preview:vue
pnpm run test:vue
```

Feel free to tweak these apps to observe how the rules behave in real scenarios.

---

## Development Workflow

1. Modify sources inside `packages/rule` or `packages/config`.
2. Run `pnpm build` to regenerate the distributable artifacts (metadata such as `{TARGET_NAME}`/`{TARGET_VERSION}` is injected here).
3. Execute `pnpm test:rule` to keep the rule suite green.
4. Optionally open the example apps for a manual smoke test.

---

## Questions

The [issue tracker][pro-issue] is **exclusively** for bug reports and feature requests.

---

# Rules Details

## explicit-member-accessibility

External eslint build-in rule (explicit-member-accessibility), allow custom accessibility with fix error code

** default rule options **

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

- `accessibility`: Set whether to detect accessibility for properties / fields / methods / constructors / parameter properties.

	```ts
	enum Accessibility {
		// off explicit
		"off",
		// [default] explicit accessibility
		"explicit",
		// explicit accessibility and remove public accessibility
		"no-public"
	}
	```

- `staticAccessibility`: Set whether to detect accessibility for static properties

	```ts
	enum StaticAccessibility {
		// off explicit
		"off",
		// explicit accessibility
		"explicit",
		// [default] explicit accessibility and remove accessibility,
		"no-accessibility"
	}
	```

- `fixWith`: When accessibility is empty, use [fixWith] filled

	```ts
	enum FixWith {
		"private",
		"protected", // [default]
		"public"
	}
	```

- `ignoredNames`: When explicit accessibility is error, ignore these names

- `overrides`: Override default accessibility for specific names

	- Specific names:
		- `constructors`: Override accessibility for constructors, default is `no-public`
		- `parameterProperties`: Override accessibility for parameter properties, default is `explicit` and `fixWith` is `public`
		- `properties`: Override accessibility for properties / fields, default is `off`
		- `accessors`: Override accessibility for accessors, default is `explicit`
		- `methods`: Override accessibility for methods, default is `explicit`

	- Allows simple configuration, just like `accessibility`.

	- Advanced usage has the following options:

		```ts
		{
			accessibility: 'explicit';
			fixWith: AccessibilityFixWith;
			ignoredNames?: string[];
		}
		// or
		{
			accessibility: 'no-public';
			ignoredNames?: string[];
		}
		```
---

## sort-import

Keeps `import` declarations grouped and ordered deterministically, mirroring `eslint-plugin-simple-import-sort` while remaining inside the `jshow` plugin.

** default rule options **

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

- `autoFix`: `"always"` (default) rewrites misplaced imports and blank lines. Set to `"off"` to only report.
- `order`: `"asc"` (default) or `"desc"` determines how paths are sorted inside each group.
- `groups`: Array of RegExp string arrays. Each inner array represents a group and the first matching pattern wins. Any import that does not match a custom group is appended after the declared groups. A single blank line is always inserted between different groups.
- `clusters`: Mirrors the `groups` array one-to-one and only affects spacing inside a group. Values `0/1/2` mean “keep compact”, “add one blank line below”, and “add one blank line both above and below”; any other number falls back to `0`. If the cluster padding meets the mandatory blank line between groups, the rule collapses the duplicate spacing back to a single blank line.

---

## sort-export

Enforces deterministic ordering for batches of `export { ... } from '...'` and `export * from '...'` declarations, replacing `eslint-plugin-simple-import-sort/exports` with a native implementation.

** default rule options **

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

- `autoFix`: `"always"` (default) rewrites misordered export declarations. Set to `"off"` to only report violations.
- `order`: `"asc"` (default) or `"desc"` controls how module specifiers and aliases are compared within the same export block.

---

## unused-import

Automatically prunes `import` specifiers that never get referenced. When every specifier in a statement is unused the rule removes the entire `import`.

** default rule options **

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

- `autoFix`: `"always"` (default) deletes unused specifiers automatically. Set to `"off"` if you only need diagnostics.
- `ignoredNames`: members matching these names are always ignored. Supports exact string matching or regex patterns (e.g., `"^_"` matches any identifier starting with underscore). Use this when `_` or other conventions mark intentionally unused imports.
- `ignoreJSDoc`: `true` (default) skips checking JSDoc comments for references. Set to `false` to consider JSDoc references (e.g., `@link`, `@see`, `@type`) when determining if an import is used.

---

## unused-variable

Targets unused variable declarations, including destructured bindings. The fixer removes the smallest range necessary (identifier, declarator, or whole statement) to keep the file syntactically valid.

** default rule options **

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

- `autoFix`: `"always"` attempts to remove the unused declaration; `"off"` only reports.
- `ignoredNames`: whitelist of identifiers that should never trigger the rule. Supports exact string matching or regex patterns (e.g., `"^_"` matches any identifier starting with underscore). Defaults to `["^_"]`.
- `ignoreFunction`: `true` (default) ignores variables initialized with function expressions, call expressions, or await expressions. Set to `false` to also check and remove unused function variables. Note: variables in destructuring patterns are always checked regardless of this option.
---

## License

[MIT](http://opensource.org/licenses/MIT)

---

**Copyright (c) 2022 jShow.org**
