import unusedVariable from '../../src/rules/unused-variable';
import { testRun } from '../utils';

testRun(unusedVariable.name, unusedVariable.rule, {
  valid: [
    {
      code: 'const a = 10; console.log(a);',
      options: [{ autoFix: 'always', ignoredNames: [] }]
    },
    {
      code: 'let a = 10; console.log(a);',
      options: [{ autoFix: 'always', ignoredNames: [] }]
    },
    {
      code: 'var a = 10; console.log(a);',
      options: [{ autoFix: 'always', ignoredNames: [] }]
    },
    {
      code: 'const a = () => {};',
      options: [{ autoFix: 'always', ignoredNames: [] }]
    },
    {
      code: 'const _, b = 10; console.log(b);',
      options: [{ autoFix: 'off', ignoredNames: ['_'] }]
    },
    {
      code: 'const { a, b } = obj; console.log(a, b);',
      options: [{ autoFix: 'always', ignoredNames: [] }]
    },
    {
      code: 'const [ a, b ] = []; console.log(a);',
      options: [{ autoFix: 'off', ignoredNames: ['b'] }]
    },
    {
      code: 'export const shouldSkip = 1;'
    },
    {
      code: 'const _temp = 1; const _cache = 2;',
      options: [{ autoFix: 'always', ignoredNames: ['^_'] }]
    },
    {
      code: 'const testVar = 1; const testValue = 2;',
      options: [{ autoFix: 'always', ignoredNames: ['^test'] }]
    },
    {
      code: 'const _a = 1; const _bb = 2; const c = 3; console.log(c);',
      options: [{ autoFix: 'always', ignoredNames: ['_a', '^_b'] }]
    },
    {
      code: 'const { _temp, normal } = obj; console.log(normal);',
      options: [{ autoFix: 'always', ignoredNames: ['^_'] }]
    },
    {
      code: 'const [ _a, _b, c ] = list; console.log(c);',
      options: [{ autoFix: 'always', ignoredNames: ['^_'] }]
    },
    {
      code: 'const fn = () => {};',
      options: [{ autoFix: 'always', ignoredNames: [], ignoreFunction: true }]
    },
    {
      code: 'const fn = function() {};',
      options: [{ autoFix: 'always', ignoredNames: [], ignoreFunction: true }]
    },
    {
      code: 'const fn = async () => {};',
      options: [{ autoFix: 'always', ignoredNames: [], ignoreFunction: true }]
    },
    {
      code: 'let fn = () => {};',
      options: [{ autoFix: 'always', ignoredNames: [], ignoreFunction: true }]
    },
    {
      code: 'const fn1 = () => {}, fn2 = () => {};',
      options: [{ autoFix: 'always', ignoredNames: [], ignoreFunction: true }]
    }
  ],
  invalid: [
    {
      code: 'let a = 1; let b = 2; console.log(a);',
      output: 'let a = 1; console.log(a);',
      errors: [{ messageId: 'unusedSingleVariable' }],
      options: [{ autoFix: 'always', ignoredNames: [] }]
    },
    {
      code: 'let a = 1, b = 2; console.log(b);',
      output: 'let  b = 2; console.log(b);',
      errors: [{ messageId: 'unusedSingleVariable' }],
      options: [{ autoFix: 'always', ignoredNames: [] }]
    },
    {
      code: 'let _, b = 2;',
      output: 'let _;',
      errors: [{ messageId: 'unusedSingleVariable' }],
      options: [{ autoFix: 'always', ignoredNames: ['_'] }]
    },
    {
      code: 'let a = 1, b = 2;',
      output: '',
      errors: [{ messageId: 'unusedAllVariable' }],
      options: [{ autoFix: 'always', ignoredNames: [] }]
    },
    {
      code: 'let { a, b } = obj;',
      output: 'let {  b } = obj;',
      errors: [{ messageId: 'unusedSingleVariable' }],
      options: [{ autoFix: 'always', ignoredNames: ['b'] }]
    },
    {
      code: 'let { a, b } = obj;',
      output: '',
      errors: [{ messageId: 'unusedAllVariable' }],
      options: [{ autoFix: 'always', ignoredNames: [] }]
    },
    {
      code: 'let { a, b } = func();',
      output: 'let {   } = func();',
      errors: [
        { messageId: 'unusedSingleVariable' },
        { messageId: 'unusedSingleVariable' }
      ],
      options: [{ autoFix: 'always', ignoredNames: [] }]
    },
    {
      code: 'let [ a, b ] = list;',
      output: 'let [  b ] = list;',
      errors: [{ messageId: 'unusedSingleVariable' }],
      options: [{ autoFix: 'always', ignoredNames: ['b'] }]
    },
    {
      code: 'let [ a, b ] = list;',
      output: '',
      errors: [{ messageId: 'unusedAllVariable' }],
      options: [{ autoFix: 'always', ignoredNames: [] }]
    },
    {
      code: 'const ignored = 1;',
      options: [{ autoFix: 'off', ignoredNames: [] }],
      errors: [{ messageId: 'unusedSingleVariable' }]
    },
    {
      code: 'let [ a, b ] = func();',
      output: 'let [   ] = func();',
      errors: [
        { messageId: 'unusedSingleVariable' },
        { messageId: 'unusedSingleVariable' }
      ],
      options: [{ autoFix: 'always', ignoredNames: [] }]
    },
    {
      code: 'const _temp = 1; const normal = 2;',
      output: 'const _temp = 1; ',
      errors: [{ messageId: 'unusedSingleVariable' }],
      options: [{ autoFix: 'always', ignoredNames: ['^_'] }]
    },
    {
      code: 'const testVar = 1; const other = 2;',
      output: 'const testVar = 1; ',
      errors: [{ messageId: 'unusedSingleVariable' }],
      options: [{ autoFix: 'always', ignoredNames: ['^test'] }]
    },
    {
      code: 'const { _temp, normal } = obj;',
      output: 'const { _temp } = obj;',
      errors: [{ messageId: 'unusedSingleVariable' }],
      options: [{ autoFix: 'always', ignoredNames: ['^_'] }]
    },
    {
      code: 'const [ _a, _b, c ] = list;',
      output: 'const [ _a, _b ] = list;',
      errors: [{ messageId: 'unusedSingleVariable' }],
      options: [{ autoFix: 'always', ignoredNames: ['^_'] }]
    },
    {
      code: 'const fn = () => {};',
      output: '',
      errors: [{ messageId: 'unusedSingleVariable' }],
      options: [{ autoFix: 'always', ignoredNames: [], ignoreFunction: false }]
    },
    {
      code: 'const fn = function() {};',
      output: '',
      errors: [{ messageId: 'unusedSingleVariable' }],
      options: [{ autoFix: 'always', ignoredNames: [], ignoreFunction: false }]
    },
    {
      code: 'const fn = async () => {};',
      output: '',
      errors: [{ messageId: 'unusedSingleVariable' }],
      options: [{ autoFix: 'always', ignoredNames: [], ignoreFunction: false }]
    },
    {
      code: 'let fn = () => {};',
      output: '',
      errors: [{ messageId: 'unusedSingleVariable' }],
      options: [{ autoFix: 'always', ignoredNames: [], ignoreFunction: false }]
    },
    {
      code: 'const a = 1, fn = () => {}; console.log(a);',
      output: 'const a = 1; console.log(a);',
      errors: [{ messageId: 'unusedSingleVariable' }],
      options: [{ autoFix: 'always', ignoredNames: [], ignoreFunction: false }]
    },
    {
      code: 'const fn = () => {};',
      options: [{ autoFix: 'off', ignoredNames: [], ignoreFunction: false }],
      errors: [{ messageId: 'unusedSingleVariable' }]
    }
  ]
});
