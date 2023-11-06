import unusedImport from '../../src/rules/unused-import';
import { testRun } from '../helper';

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
      output: "import { abc,  bar } from './foo';",
      errors: [{ messageId: 'unusedSingleImport' }],
      options: [{ autoFix: 'always', ignoredNames: ['abc', 'bar'] }]
    },
    {
      code: "import { foo } from './foo';",
      errors: [{ messageId: 'unusedAllImport' }],
      options: [{ autoFix: 'off', ignoredNames: ['bar'] }]
    }
  ]
});
