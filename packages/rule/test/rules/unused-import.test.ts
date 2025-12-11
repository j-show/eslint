import unusedImport from '../../src/rules/unused-import';
import { testRun } from '../utils';

testRun(unusedImport.name, unusedImport.rule, {
  valid: [
    {
      code: "import { foo } from './foo'; foo();",
      options: [{ autoFix: 'always', ignoredNames: [] }]
    },
    {
      code: "import { foo as _ } from './foo'; _();",
      options: [{ autoFix: 'off', ignoredNames: [] }]
    },
    {
      code: "import { foo } from './foo';",
      options: [{ autoFix: 'always', ignoredNames: ['foo'] }]
    },
    {
      code: "import { foo } from './foo';",
      options: [{ autoFix: 'off', ignoredNames: ['foo'] }]
    },
    {
      code: "import foo from './foo'; foo();",
      options: [{ autoFix: 'always', ignoredNames: [] }]
    },
    {
      code: "import * as foo from './foo'; foo.bar();",
      options: [{ autoFix: 'always', ignoredNames: [] }]
    },
    {
      code: "import type { Foo } from './foo';\ntype Bar = Foo;",
      filename: 'index.ts'
    },
    {
      code: [
        "import { foo } from './foo';",
        '/** @type {foo} */',
        'const bar = null;'
      ].join('\n'),
      options: [{ autoFix: 'always', ignoredNames: [], ignoreJSDoc: false }]
    },
    {
      code: [
        "import { foo } from './foo';",
        '/** @type {foo} */',
        'const bar = null;'
      ].join('\n'),
      options: [{ autoFix: 'always', ignoredNames: [], ignoreJSDoc: false }]
    },
    {
      code: [
        "import { Foo } from './foo';",
        '/** @param {Foo} param - description */',
        'function test(param) {}'
      ].join('\n'),
      options: [{ autoFix: 'always', ignoredNames: [], ignoreJSDoc: false }]
    },
    {
      code: [
        "import { Foo } from './foo';",
        '/** @returns {Foo} description */',
        'function test() { return null; }'
      ].join('\n'),
      options: [{ autoFix: 'always', ignoredNames: [], ignoreJSDoc: false }]
    },
    {
      code: [
        "import { Foo } from './foo';",
        '/** @return {Foo} description */',
        'function test() { return null; }'
      ].join('\n'),
      options: [{ autoFix: 'always', ignoredNames: [], ignoreJSDoc: false }]
    },
    {
      code: [
        "import { Foo } from './foo';",
        '/** @typedef {Foo} TypeDef */',
        'const bar = null;'
      ].join('\n'),
      options: [{ autoFix: 'always', ignoredNames: [], ignoreJSDoc: false }]
    },
    {
      code: [
        "import { Foo } from './foo';",
        '/** @link Foo */',
        'const bar = null;'
      ].join('\n'),
      options: [{ autoFix: 'always', ignoredNames: [], ignoreJSDoc: false }]
    },
    {
      code: [
        "import { Foo } from './foo';",
        '/** {@link Foo} */',
        'const bar = null;'
      ].join('\n'),
      options: [{ autoFix: 'always', ignoredNames: [], ignoreJSDoc: false }]
    },
    {
      code: [
        "import { Foo } from './foo';",
        '/** @linkcode Foo */',
        'const bar = null;'
      ].join('\n'),
      options: [{ autoFix: 'always', ignoredNames: [], ignoreJSDoc: false }]
    },
    {
      code: [
        "import { Foo } from './foo';",
        '/** {@linkcode Foo} */',
        'const bar = null;'
      ].join('\n'),
      options: [{ autoFix: 'always', ignoredNames: [], ignoreJSDoc: false }]
    },
    {
      code: [
        "import { Foo } from './foo';",
        '/** @linkplain Foo */',
        'const bar = null;'
      ].join('\n'),
      options: [{ autoFix: 'always', ignoredNames: [], ignoreJSDoc: false }]
    },
    {
      code: [
        "import { Foo } from './foo';",
        '/** {@linkplain Foo} */',
        'const bar = null;'
      ].join('\n'),
      options: [{ autoFix: 'always', ignoredNames: [], ignoreJSDoc: false }]
    },
    {
      code: [
        "import { Foo } from './foo';",
        '/** @see Foo */',
        'const bar = null;'
      ].join('\n'),
      options: [{ autoFix: 'always', ignoredNames: [], ignoreJSDoc: false }]
    },
    {
      code: [
        "import { Foo } from './foo';",
        '/** @template T extends Foo */',
        'function test() {}'
      ].join('\n'),
      options: [{ autoFix: 'always', ignoredNames: [], ignoreJSDoc: false }]
    },
    {
      code: [
        "import { Base } from './foo';",
        '/** @augments Base */',
        'class Derived {}'
      ].join('\n'),
      options: [{ autoFix: 'always', ignoredNames: [], ignoreJSDoc: false }]
    },
    {
      code: [
        "import { Base } from './foo';",
        '/** @extends Base */',
        'class Derived {}'
      ].join('\n'),
      options: [{ autoFix: 'always', ignoredNames: [], ignoreJSDoc: false }]
    },
    {
      code: [
        "import { Interface } from './foo';",
        '/** @implements Interface */',
        'class MyClass {}'
      ].join('\n'),
      options: [{ autoFix: 'always', ignoredNames: [], ignoreJSDoc: false }]
    },
    {
      code: [
        "import { Foo, Bar } from './foo';",
        '/**',
        ' * @param {Foo} foo - description',
        ' * @returns {Bar} description',
        ' */',
        'function test(foo) { return null; }'
      ].join('\n'),
      options: [{ autoFix: 'always', ignoredNames: [], ignoreJSDoc: false }]
    },
    {
      code: "import './foo';"
    },
    {
      code: "import _ from './foo';"
    },
    {
      code: "import { _foo } from './foo';",
      options: [{ ignoredNames: ['^_.*'] }]
    },
    {
      code: "import { Foo } from './foo';",
      options: [{ ignoredNames: ['[fF]oo'] }]
    }
  ],
  invalid: [
    {
      code: "import { foo, abc } from './foo';",
      output: '',
      errors: [{ messageId: 'unusedAllImport' }],
      options: [{ autoFix: 'always', ignoredNames: [] }]
    },
    {
      code: "import { foo } from './foo';",
      errors: [{ messageId: 'unusedAllImport' }],
      options: [{ autoFix: 'off', ignoredNames: [] }]
    },
    {
      code: "import { abc, foo, bar } from './foo';",
      output: "import { abc, bar } from './foo';",
      errors: [{ messageId: 'unusedSingleImport' }],
      options: [{ autoFix: 'always', ignoredNames: ['abc', 'bar'] }]
    },
    {
      code: "import { foo } from './foo';",
      errors: [{ messageId: 'unusedAllImport' }],
      options: [{ autoFix: 'off', ignoredNames: ['bar'] }]
    },
    {
      code: "import foo, { bar } from './foo'; bar();",
      output: "import { bar } from './foo'; bar();",
      errors: [{ messageId: 'unusedSingleImport' }],
      options: [{ autoFix: 'always', ignoredNames: [] }]
    },
    {
      code: "import foo, { bar } from './foo'; foo();",
      output: "import foo from './foo'; foo();",
      errors: [{ messageId: 'unusedSingleImport' }],
      options: [{ autoFix: 'always', ignoredNames: [] }]
    },
    {
      code: "import * as foo from './foo'; const bar = 1;",
      output: 'const bar = 1;',
      errors: [{ messageId: 'unusedAllImport' }],
      options: [{ autoFix: 'always', ignoredNames: [] }]
    },
    {
      code: "import type { Foo } from './foo'; const value = 1;",
      output: 'const value = 1;',
      filename: 'foo.ts',
      errors: [{ messageId: 'unusedAllImport' }],
      options: [{ autoFix: 'always', ignoredNames: [] }]
    },
    {
      code: ['import {', '  foo,', '  bar', "} from './foo';", 'bar();'].join(
        '\n'
      ),
      output: ["import {\n  bar\n} from './foo';", 'bar();'].join('\n'),
      errors: [{ messageId: 'unusedSingleImport' }],
      options: [{ autoFix: 'always', ignoredNames: [] }]
    },
    {
      code: ["import foo, * as helpers from './foo';", 'foo();'].join('\n'),
      output: ["import foo from './foo';", 'foo();'].join('\n'),
      errors: [{ messageId: 'unusedSingleImport' }],
      options: [{ autoFix: 'always', ignoredNames: [] }]
    },
    {
      code: "import { ignored, target } from './foo';",
      output: "import { ignored } from './foo';",
      errors: [{ messageId: 'unusedSingleImport' }],
      options: [{ autoFix: 'always', ignoredNames: ['ignored'] }]
    },
    {
      code: "import { foo, bar } from './foo'; bar();",
      errors: [{ messageId: 'unusedSingleImport' }],
      options: [{ autoFix: 'off', ignoredNames: [] }]
    },
    {
      code: "import { _foo, target } from './foo';",
      output: "import { _foo } from './foo';",
      errors: [{ messageId: 'unusedSingleImport' }],
      options: [{ autoFix: 'always', ignoredNames: ['^_.*'] }]
    },
    {
      code: [
        "import { Foo, Bar } from './foo';",
        '/** @type {Foo} */',
        'const foo = null;'
      ].join('\n'),
      output: [
        "import { Foo } from './foo';",
        '/** @type {Foo} */',
        'const foo = null;'
      ].join('\n'),
      errors: [{ messageId: 'unusedSingleImport' }],
      options: [{ autoFix: 'always', ignoredNames: [], ignoreJSDoc: false }]
    },
    {
      code: [
        "import { Foo } from './foo';",
        '/** Some comment without Foo */',
        'const bar = null;'
      ].join('\n'),
      errors: [{ messageId: 'unusedAllImport' }],
      options: [{ autoFix: 'off', ignoredNames: [] }]
    },
    {
      code: [
        "import { Foo, Bar } from './foo';",
        '/** @param {Foo} param */',
        'function test(param) {}'
      ].join('\n'),
      output: [
        "import { Foo } from './foo';",
        '/** @param {Foo} param */',
        'function test(param) {}'
      ].join('\n'),
      errors: [{ messageId: 'unusedSingleImport' }],
      options: [{ autoFix: 'always', ignoredNames: [], ignoreJSDoc: false }]
    },
    {
      code: [
        "import { Foo } from './foo';",
        '/** @type {Foo} */',
        'const bar = null;'
      ].join('\n'),
      output: ['/** @type {Foo} */', 'const bar = null;'].join('\n'),
      errors: [{ messageId: 'unusedAllImport' }],
      options: [{ autoFix: 'always', ignoredNames: [], ignoreJSDoc: true }]
    },
    {
      code: [
        "import { Foo } from './foo';",
        '/** @param {Foo} param */',
        'function test(param) {}'
      ].join('\n'),
      output: ['/** @param {Foo} param */', 'function test(param) {}'].join(
        '\n'
      ),
      errors: [{ messageId: 'unusedAllImport' }],
      options: [{ autoFix: 'always', ignoredNames: [], ignoreJSDoc: true }]
    },
    {
      code: [
        "import { Foo } from './foo';",
        '/** @type {Foo} */',
        'const bar = null;'
      ].join('\n'),
      errors: [{ messageId: 'unusedAllImport' }],
      options: [{ autoFix: 'off', ignoredNames: [], ignoreJSDoc: true }]
    },
    {
      code: [
        "import { Foo, Bar } from './foo';",
        '/** @type {Foo} */',
        'const bar = null;'
      ].join('\n'),
      output: ['/** @type {Foo} */', 'const bar = null;'].join('\n'),
      errors: [{ messageId: 'unusedAllImport' }],
      options: [{ autoFix: 'always', ignoredNames: [], ignoreJSDoc: true }]
    },
    {
      code: [
        "import { Foo } from './foo';",
        '// Single line comment with Foo',
        'const bar = null;'
      ].join('\n'),
      errors: [{ messageId: 'unusedAllImport' }],
      options: [{ autoFix: 'off', ignoredNames: [] }]
    }
  ]
});
