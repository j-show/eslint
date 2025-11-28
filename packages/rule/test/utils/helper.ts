import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { TSESLint } from '@typescript-eslint/utils';
import { flattenDeep } from 'lodash-es';
import { stripIndent } from 'common-tags';

export const createRuleTester = () => {
  const parserOptions: TSESLint.ParserOptions = {
    ecmaVersion: 2022,
    ecmaFeatures: { jsx: true },
    sourceType: 'module',
    tsconfigRootDir: __dirname
  };

  const tester = new RuleTester({
    languageOptions: {
      parser,
      parserOptions
    }
  });

  const run = tester.run;
  const to = (code: any) =>
    typeof code === 'string' ? { code, errors: [] } : { errors: [], ...code };

  const dedupeCases = (cases: any[]) => {
    const seen = new Set<string>();
    return cases.filter(testCase => {
      const key = JSON.stringify({
        code: testCase.code,
        options: testCase.options,
        filename: testCase.filename
      });

      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  tester.run = (name, rule, { invalid = [], valid = [] }) =>
    run.call(tester, name, rule, {
      invalid: dedupeCases(flattenDeep(invalid).filter(Boolean).map(to)),
      valid: dedupeCases(flattenDeep(valid).filter(Boolean).map(to))
    });

  return tester;
};

export const ruleTester = createRuleTester();

type AnyRuleRun = (name: string, rule: any, cases: any) => void;

export const testRun: AnyRuleRun = (name, rule, cases) =>
  (ruleTester as any).run(name, rule, cases);

export const testEntity =
  <M extends string, O>(template: string) =>
  (text: string, option?: O, error?: M, output?: string): any => {
    const code = stripIndent(template.replace('{data}', text));
    const result: any = {
      code
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
