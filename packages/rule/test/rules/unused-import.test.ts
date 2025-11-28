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
      options: [{ autoFix: 'always', ignoredNames: [] }]
    },
    {
      code: "import './foo';"
    },
    {
      code: "import _ from './foo';"
    },
    {
      code: "import { _foo } from './foo';",
      options: [{ ignoredNames: ['_*'] }]
    },
    {
      code: "import { Foo } from './foo';",
      options: [{ ignoredNames: ['/foo/i'] }]
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
      options: [{ autoFix: 'always', ignoredNames: ['_*'] }]
    }
  ]
});
