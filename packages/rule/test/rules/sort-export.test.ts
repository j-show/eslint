import { stripIndent } from 'common-tags';

import sortExport from '../../src/rules/sort-export';
import { testRun } from '../utils';

const format = (text: TemplateStringsArray, ...values: unknown[]) =>
  stripIndent(String.raw(text, ...values));

testRun(sortExport.name, sortExport.rule, {
  valid: [
    {
      code: format`
        export { alpha } from './alpha';
        export { beta } from './beta';
      `
    },
    {
      code: format`
        export { beta } from './beta';
        export { alpha } from './alpha';
      `,
      options: [{ order: 'desc' }]
    },
    {
      code: format`
        export { foo } from './foo';

        const keep = true;

        export { alpha } from './alpha';
        export { beta } from './beta';
      `
    }
  ],
  invalid: [
    {
      code: format`
        export { beta } from './beta';
        export { alpha } from './alpha';
      `,
      output: format`
        export { alpha } from './alpha';
        export { beta } from './beta';
      `,
      errors: [{ messageId: 'exportsNotSorted' }]
    },
    {
      code: format`
        export { foo } from './foo';
        export * as utils from './utils';
      `,
      output: format`
        export * as utils from './utils';
        export { foo } from './foo';
      `,
      errors: [{ messageId: 'exportsNotSorted' }]
    },
    {
      code: format`
        export { alpha } from './alpha';
        export { beta } from './beta';
      `,
      options: [{ order: 'desc' }],
      output: format`
        export { beta } from './beta';
        export { alpha } from './alpha';
      `,
      errors: [{ messageId: 'exportsNotSorted' }]
    },
    {
      code: format`
        export { foo } from './foo';

        const keep = true;

        export { baz } from './baz';
        export { bar } from './bar';
      `,
      output: format`
        export { foo } from './foo';

        const keep = true;

        export { bar } from './bar';
        export { baz } from './baz';
      `,
      errors: [{ messageId: 'exportsNotSorted' }]
    },
    {
      code: format`
        export type { Z } from './z';
        export type { A } from './a';
      `,
      output: format`
        export type { A } from './a';
        export type { Z } from './z';
      `,
      errors: [{ messageId: 'exportsNotSorted' }]
    },
    {
      code: format`
        export { beta } from './beta';
        export { alpha } from './alpha';
      `,
      options: [{ autoFix: 'off' }],
      errors: [{ messageId: 'exportsNotSorted' }]
    }
  ]
});
