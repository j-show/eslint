import unusedVariable from '../../src/rules/unused-variable';
import { testRun } from '../helper';

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
    }
  ],
  invalid: [
    {
      code: 'let a = 1; let b = 2; console.log(a);',
      output: 'let a = 1;  console.log(a);',
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
      code: 'let [ a, b ] = func();',
      output: 'let [   ] = func();',
      errors: [
        { messageId: 'unusedSingleVariable' },
        { messageId: 'unusedSingleVariable' }
      ],
      options: [{ autoFix: 'always', ignoredNames: [] }]
    }
  ]
});
