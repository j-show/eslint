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

[pro-github]: https://github.com/j-show/eslint-plugin-jshow
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

---

# Supporting

jShow is an MIT-Licensed open source project with its ongoing development made possible entirely by the support of these awesome [backers](https://github.com/j-show/jShow/blob/master/BACKERS.md). If you'd like to join them, please consider:

- [Become a backer or sponsor on Patreon](https://www.patreon.com/jshow).
- [Become a backer or sponsor on Open Collective](https://opencollective.com/jshow).

### What's the difference between Patreon and OpenCollective?

Funds donated via Patreon go directly to support [eslint-plugin-jshow][pro-github] You's full-time work on jShow. Funds donated via OpenCollective are managed with transparent expenses and will be used for compensating work and expenses for core team members or sponsoring community events. Your name/logo will receive proper recognition and exposure by donating on either platform.

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
					"constructors": "no-public",
					"properties": "off",
					"parameterProperties": {
						"accessibility": "explicit",
						"fixWith": "public",
					},
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
		type AdvancedOverrides = 
			| {
          accessibility: 'explicit';
          fixWith: AccessibilityFixWith;
          ignoredNames?: string[];
        }
			| {
          accessibility: 'no-public';
          ignoredNames?: string[];
        }
		```

---

# Folder

```
──
 └── dist            // output folder
 └── src             // source folder
 │ └── index.js      // main script file
 │ └── rules         // eslint rules folder
 └── test            // mocha test folder
```

---

``

---

# Questions

The [issue](https://github.com/j-show/eslint-plugin-jshow/issues) list of this repo is **exclusively** for bug reports and feature requests.

---

# License

[MIT](http://opensource.org/licenses/MIT)

---

**Copyright (c) 2022 jShow.org**
