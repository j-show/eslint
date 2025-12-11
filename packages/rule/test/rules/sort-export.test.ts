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
        export type { B } from './z';
      `,
      output: format`
        export type { A } from './a';
        export type { B, Z } from './z';
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
    },
    {
      code: format`
        export { foo } from './utils';
        export { bar } from './utils';
        export { baz } from './utils';
      `,
      output: format`
        export { bar, baz, foo } from './utils';
      `,
      errors: [{ messageId: 'exportsNotSorted' }]
    },
    {
      code: format`
        export { Z } from './z';
        export { A } from './a';
        export { B } from './z';
        export { C } from './a';
      `,
      output: format`
        export { A, C } from './a';
        export { B, Z } from './z';
      `,
      errors: [{ messageId: 'exportsNotSorted' }]
    },
    {
      code: format`
        export type { Z } from './z';
        export type { A } from './a';
        export type { B } from './z';
        export { value } from './z';
      `,
      output: format`
        export type { A } from './a';
        export { value, type B, type Z } from './z';
      `,
      errors: [{ messageId: 'exportsNotSorted' }]
    },
    {
      code: format`
        export { foo as Foo } from './utils';
        export { bar } from './utils';
        export { baz as Baz } from './utils';
      `,
      output: format`
        export { bar, baz as Baz, foo as Foo } from './utils';
      `,
      errors: [{ messageId: 'exportsNotSorted' }]
    },
    {
      code: format`
        export { alpha } from './alpha';
        export { beta } from './beta';
        export { gamma } from './alpha';
      `,
      output: format`
        export { alpha, gamma } from './alpha';
        export { beta } from './beta';
      `,
      errors: [{ messageId: 'exportsNotSorted' }]
    },
    {
      code: format`
        export type { User } from './types';
        export type { Post } from './types';
        export type { Comment } from './types';
      `,
      output: format`
        export type { Comment, Post, User } from './types';
      `,
      errors: [{ messageId: 'exportsNotSorted' }]
    },
    {
      code: format`
        export { beta } from './beta';
        export { alpha } from './alpha';
        export { gamma } from './beta';
      `,
      options: [{ order: 'desc' }],
      output: format`
        export { gamma, beta } from './beta';
        export { alpha } from './alpha';
      `,
      errors: [{ messageId: 'exportsNotSorted' }]
    }
  ]
});
