import { stripIndent } from 'common-tags';

import sortImport from '../../src/rules/sort-import';
import { testRun } from '../utils';

const format = (text: TemplateStringsArray, ...values: unknown[]) =>
  stripIndent(String.raw(text, ...values));

testRun(sortImport.name, sortImport.rule, {
  valid: [
    {
      code: format`
        import fs from 'fs';
        import path from 'path';

        import app from '@/app';

        import local from './local';
      `
    },
    {
      code: format`
        import z from 'z';
        import a from 'a';
      `,
      options: [{ order: 'desc' }]
    },
    {
      code: format`
        // libs
        import React from 'react';

        import 'reflect-metadata';

        // local
        import foo from './foo';
      `,
      options: [
        {
          groups: [['^\\u0000'], ['^react'], ['^\\.']],
          clusters: [0, 1, 2]
        }
      ]
    },
    {
      code: format`
        import a from 'a';

        import b from 'b';
      `,
      options: [
        {
          groups: [['^@?[a-zA-Z]']],
          clusters: [1]
        }
      ]
    },
    {
      code: format`
        import a from 'a';


        import b from 'b';


        import c from 'c';
      `,
      options: [
        {
          groups: [['^@?[a-zA-Z]']],
          clusters: [2]
        }
      ]
    },
    {
      code: format`
        import alpha from 'alpha';

        import beta from 'beta';

        import foo from './foo';
      `,
      options: [
        {
          groups: [['^@?[a-zA-Z]'], ['^\\.']],
          clusters: [1]
        }
      ]
    },
    {
      code: format`
        import foo from 'foo';

        import bar from './bar';
      `,
      options: [
        {
          groups: [['^@?[a-zA-Z]'], ['^\\.']],
          clusters: [-1, 3]
        }
      ]
    },
    {
      code: format`
        // keep order
        import z from 'z';
        import a from 'a';
      `
    },
    {
      code: format`
        import { a, b } from 'foo';
      `
    },
    {
      code: format`
        import a, { b } from 'foo';
      `
    },
    {
      code: format`
        import { type TypeA, ValueA } from 'module';
      `
    },
    {
      code: format`
        import { type TypeA, type TypeB, ValueA } from 'module';
      `
    },
    {
      code: format`
        import { type TypeA, ValueA } from 'module-a';
        import { type TypeB, ValueB } from 'module-b';
      `
    },
    {
      code: format`
        import DefaultValue, { type TypeA, ValueA } from 'module';
      `
    },
    {
      code: format`
        import type DefaultType, { ValueA } from 'module';
      `
    }
  ],
  invalid: [
    {
      code: format`
        import { a } from 'foo';
        import { b } from 'foo';
      `,
      output: format`
        import { a, b } from 'foo';
      `,
      errors: [{ messageId: 'importsNotSorted' }]
    },
    {
      code: format`
        import a from 'foo';
        import { b } from 'foo';
      `,
      output: format`
        import a, { b } from 'foo';
      `,
      errors: [{ messageId: 'importsNotSorted' }]
    },
    {
      code: format`
        import { a } from 'foo';
        import { b } from 'bar';
        import { c } from 'foo';
      `,
      output: format`
        import { b } from 'bar';
        import { a, c } from 'foo';
      `,
      errors: [{ messageId: 'importsNotSorted' }]
    },
    {
      code: format`
        import a from 'foo';
        import { b, c } from 'foo';
      `,
      output: format`
        import a, { b, c } from 'foo';
      `,
      errors: [{ messageId: 'importsNotSorted' }]
    },
    {
      code: format`
        import { a } from 'foo';
        import { b } from 'foo';
        import { c } from 'foo';
      `,
      output: format`
        import { a, b, c } from 'foo';
      `,
      errors: [{ messageId: 'importsNotSorted' }]
    },
    {
      code: format`
        import z from 'z';
        import a from 'a';
      `,
      output: format`
        import a from 'a';
        import z from 'z';
      `,
      errors: [{ messageId: 'importsNotSorted' }]
    },
    {
      code: format`
        import fs from 'fs';
        import path from 'path';
        import local from './local';
      `,
      output: format`
        import fs from 'fs';
        import path from 'path';

        import local from './local';
      `,
      options: [
        {
          groups: [['^@?[a-zA-Z]'], ['^\\.']],
          clusters: [0, 1]
        }
      ],
      errors: [{ messageId: 'importsNotSorted' }]
    },
    {
      code: format`
        import './polyfill';
        import utils from '@/utils';
        import React from 'react';
      `,
      output: format`
        import React from 'react';

        import utils from '@/utils';

        import './polyfill';
      `,
      options: [
        {
          groups: [['^react'], ['^@/'], ['^\\.']],
          clusters: [0, 1, 2]
        }
      ],
      errors: [{ messageId: 'importsNotSorted' }]
    },
    {
      code: format`
        import a from 'a';
        import b from 'b';
      `,
      output: format`
        import a from 'a';

        import b from 'b';
      `,
      options: [
        {
          groups: [['^@?[a-zA-Z]']],
          clusters: [1]
        }
      ],
      errors: [{ messageId: 'importsNotSorted' }]
    },
    {
      code: format`
        import a from 'a';
        import b from 'b';
        import c from 'c';
      `,
      output: format`
        import a from 'a';


        import b from 'b';


        import c from 'c';
      `,
      options: [
        {
          groups: [['^@?[a-zA-Z]']],
          clusters: [2]
        }
      ],
      errors: [{ messageId: 'importsNotSorted' }]
    },
    {
      code: format`
        import a from 'a';

        import b from 'b';
      `,
      output: format`
        import a from 'a';
        import b from 'b';
      `,
      options: [
        {
          groups: [['^@?[a-zA-Z]']],
          clusters: [-1]
        }
      ],
      errors: [{ messageId: 'importsNotSorted' }]
    },
    {
      code: format`
        import a from 'a';


        import b from 'b';


        import c from 'c';
      `,
      output: format`
        import a from 'a';
        import b from 'b';
        import c from 'c';
      `,
      options: [
        {
          groups: [['^@?[a-zA-Z]']],
          clusters: [3]
        }
      ],
      errors: [{ messageId: 'importsNotSorted' }]
    },
    {
      code: format`
        import alpha from 'alpha';

        import beta from 'beta';


        import foo from './foo';
      `,
      output: format`
        import alpha from 'alpha';

        import beta from 'beta';

        import foo from './foo';
      `,
      options: [
        {
          groups: [['^@?[a-zA-Z]'], ['^\\.']],
          clusters: [1]
        }
      ],
      errors: [{ messageId: 'importsNotSorted' }]
    },
    {
      code: format`
        import z from 'z';
        import a from 'a';
      `,
      options: [{ autoFix: false }],
      errors: [{ messageId: 'importsNotSorted' }]
    },
    {
      code: format`
        /* comment */
        import z from 'z';
        import a from 'a';
      `,
      output: format`
        /* comment */
        import a from 'a';
        import z from 'z';
      `,
      errors: [{ messageId: 'importsNotSorted' }]
    },
    {
      code: format`
        import { ValueA } from 'module';
        import type { TypeA } from 'module';
      `,
      output: format`
        import { type TypeA, ValueA } from 'module';
      `,
      errors: [{ messageId: 'importsNotSorted' }]
    },
    {
      code: format`
        import type { TypeA } from 'module';
        import { ValueA } from 'module';
      `,
      output: format`
        import { type TypeA, ValueA } from 'module';
      `,
      errors: [{ messageId: 'importsNotSorted' }]
    },
    {
      code: format`
        import type { TypeA } from 'module';
        import type { TypeB } from 'module';
        import { ValueA } from 'module';
      `,
      output: format`
        import { type TypeA, type TypeB, ValueA } from 'module';
      `,
      errors: [{ messageId: 'importsNotSorted' }]
    },
    {
      code: format`
        import { ValueA } from 'module';
        import type { TypeA } from 'module';
        import { ValueB } from 'module';
      `,
      output: format`
        import { type TypeA, ValueA, ValueB } from 'module';
      `,
      errors: [{ messageId: 'importsNotSorted' }]
    },
    {
      code: format`
        import type DefaultType from 'module';
        import { ValueA } from 'module';
      `,
      output: format`
        import type DefaultType, { ValueA } from 'module';
      `,
      errors: [{ messageId: 'importsNotSorted' }]
    },
    {
      code: format`
        import DefaultValue from 'module';
        import type { TypeA } from 'module';
      `,
      output: format`
        import DefaultValue, { type TypeA } from 'module';
      `,
      errors: [{ messageId: 'importsNotSorted' }]
    },
    {
      code: format`
        import { type TypeA } from 'module';
        import { ValueA } from 'module';
      `,
      output: format`
        import { type TypeA, ValueA } from 'module';
      `,
      errors: [{ messageId: 'importsNotSorted' }]
    },
    {
      code: format`
        import { ValueA } from 'module';
        import { type TypeA } from 'module';
      `,
      output: format`
        import { type TypeA, ValueA } from 'module';
      `,
      errors: [{ messageId: 'importsNotSorted' }]
    },
    {
      code: format`
        import type { TypeA } from 'module-a';
        import { ValueB } from 'module-b';
        import { ValueA } from 'module-a';
      `,
      output: format`
        import { type TypeA, ValueA } from 'module-a';
        import { ValueB } from 'module-b';
      `,
      errors: [{ messageId: 'importsNotSorted' }]
    },
    {
      code: format`
        import { type TypeA, ValueA } from 'module';
        import { type TypeB } from 'module';
      `,
      output: format`
        import { type TypeA, type TypeB, ValueA } from 'module';
      `,
      errors: [{ messageId: 'importsNotSorted' }]
    }
  ]
});
