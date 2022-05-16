import { TSESLint } from '@typescript-eslint/utils';
import { flattenDeep } from 'lodash';
import { stripIndent } from 'common-tags';

export const createRuleTester = () => {
  const parser = require.resolve('@typescript-eslint/parser');

  const tester = new TSESLint.RuleTester({
    parser,
    parserOptions: {
      ecmaVersion: 2022,
      ecmaFeatures: { jsx: true },
      sourceType: 'module',
      tsconfigRootDir: __dirname,
    },
  });

  const run = tester.run;
  const to = (code: any) => (typeof code === 'string' ? { code, errors: [] } : { errors: [], ...code });

  tester.run = (name, rule, { invalid = [], valid = [] }) =>
    run.call(tester, name, rule, {
      invalid: flattenDeep(invalid).filter(Boolean).map(to),
      valid: flattenDeep(valid).filter(Boolean).map(to),
    });

  return tester;
};

export const ruleTester = createRuleTester();

export const testRun = ruleTester.run;

export const testEntity =
  <M extends string, O>(template: string) =>
  (text: string, option?: O, error?: M, output?: string): any => {
    const code = stripIndent(template.replace('{data}', text));
    const result: any = {
      code,
    };

    if (option != null) {
      result.options = Array.isArray(option) ? option : [option];
      // result.code = `// ${JSON.stringify(option)}\n` + result.code;
    }

    if (error != null) {
      result.errors = [{ messageId: error }];
    }

    if (output != null) result.output = template.replace('{data}', output);

    return result;
  };
