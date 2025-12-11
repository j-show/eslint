import eslintJs from '@eslint/js';
import pluginEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import type { ESLint, Linter } from 'eslint';
import pluginJshow from 'eslint-plugin-jshow';
import globals from 'globals';
import typescriptEslint from 'typescript-eslint';

import { buildCompat } from './utils';

/**
 * jShow 的 TypeScript 通用规则集
 *
 * 该配置在官方推荐规则之上开启了大量实践约束，同时挂载自研插件
 * (`eslint-plugin-jshow`) 以强制显式访问修饰符、禁止未使用的导入/变量，
 * 并预先串好 import 排序策略，适合作为所有下游配置的基础。
 *
 * 该配置包含：
 * - ESLint 官方推荐规则
 * - TypeScript ESLint 推荐规则
 * - jShow 自定义规则（explicit-member-accessibility、sort-import、sort-export、unused-import、unused-variable）
 * - 针对测试框架的全局变量（vitest、jest）
 *
 * @example
 * ```js
 * import typescriptConfig from 'eslint-config-jshow/typescript';
 *
 * export default [...typescriptConfig];
 * ```
 */

const legacyConfigs: Linter.Config[] = buildCompat(
  eslintJs.configs.recommended,
  typescriptEslint.configs.recommended,
  {
    plugins: {
      '@typescript-eslint': pluginEslint as unknown as ESLint.Plugin,
      jshow: pluginJshow
    },

    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2020
      },

      globals: {
        ...globals.es2020,
        ...globals.vitest,
        ...globals.jest
      }
    },

    rules: {
      //#region eslint

      'no-console': ['error', { allow: ['warn', 'error', 'info', 'debug'] }],
      'no-constant-binary-expression': 'error',
      'no-constant-condition': 'warn',
      'no-continue': 'off',
      'no-control-regex': 'off',
      'no-debugger': 'warn',
      'no-duplicate-imports': 'error',
      'no-else-return': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-empty-pattern': 'warn',
      'no-empty-static-block': 'warn',
      'no-eq-null': 'off',
      'no-eval': 'error',
      'no-extend-native': 'error',
      'no-extra-semi': 'error',
      'no-fallthrough': 'warn',
      'no-floating-decimal': 'error',
      'no-implicit-coercion': 'off',
      'no-implied-eval': 'error',
      'no-inline-comments': 'error',
      'no-invalid-this': 'error',
      'no-iterator': 'error',
      'no-label-var': 'error',
      'no-labels': 'error',
      'no-lone-blocks': 'error',
      'no-loop-func': 'error',
      'no-mixed-requires': 'error',
      'no-mixed-spaces-and-tabs': 'error',
      'no-multi-spaces': 'error',
      'no-multi-str': 'error',
      'no-native-reassign': 'error',
      'no-negated-in-lhs': 'error',
      'no-nested-ternary': 'warn',
      'no-new': 'warn',
      'no-new-func': 'error',
      'no-new-object': 'error',
      'no-new-wrappers': 'error',
      'no-param-reassign': 'error',
      'no-proto': 'error',
      'no-prototype-builtins': 'warn',
      'no-regex-spaces': 'warn',
      'no-return-assign': 'warn',
      'no-script-url': 'error',
      'no-self-compare': 'error',
      'no-sequences': 'error',
      'no-this-before-super': 'error',
      'no-throw-literal': 'off',
      'no-undefined': 'error',
      'no-useless-escape': 'warn',
      'no-use-before-define': 'error',
      'no-var': 'error',
      'no-void': ['error', { allowAsStatement: true }],

      'no-restricted-syntax': [
        'error',
        {
          selector: `MemberExpression[property.name="name"]:has(MemberExpressionp[property.name='constructor'])`,
          message:
            'Cannot use `xxx.constructor.name`, because the interpretation of the class name fails after causing confusion.'
        }
      ],

      'block-scoped-var': 'error',
      'constructor-super': 'error',
      'default-param-last': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],

      'prefer-const': [
        'error',
        { ignoreReadBeforeAssign: true, destructuring: 'all' }
      ],

      //#endregion

      //#region @typescript-eslint

      '@typescript-eslint/no-empty-function': [
        'error',
        { allow: ['arrowFunctions', 'decoratedFunctions'] }
      ],
      '@typescript-eslint/no-empty-object-type': [
        'warn',
        { allowInterfaces: 'with-single-extends' }
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-invalid-void-type': 'warn',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-this-alias': 'off',

      '@typescript-eslint/no-restricted-types': [
        'error',
        {
          types: {
            Object: {
              message: 'Use {} instead.'
            },
            String: {
              message: 'Use string instead.',
              fixWith: 'string'
            },
            Number: {
              message: 'Use number instead.',
              fixWith: 'number'
            },
            Boolean: {
              message: 'Use boolean instead.',
              fixWith: 'boolean'
            }
          }
        }
      ],
      '@typescript-eslint/no-require-imports': 'warn',

      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'none',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/no-use-before-define': [
        'warn',
        { functions: false, classes: false, typedefs: false, variables: false }
      ],
      '@typescript-eslint/no-wrapper-object-types': 'error',

      '@typescript-eslint/adjacent-overload-signatures': 'error',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/camelcase': 'off',
      '@typescript-eslint/class-name-casing': [
        'off',
        { allowUnderscorePrefix: true }
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'inline-type-imports' }
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-member-accessibility': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/unbound-method': ['off', { ignoreStatic: true }],

      '@typescript-eslint/member-ordering': [
        'warn',
        {
          classes: {
            order: 'as-written',
            memberTypes: [
              'signature',
              // static
              'static-field',
              ['static-get', 'static-set'],
              'static-method',
              // field
              'private-instance-field',
              'protected-instance-field',
              'public-instance-field',
              // constructor
              'constructor',
              // instance getter & set
              ['private-instance-get', 'private-instance-set'],
              [
                'protected-abstract-get',
                'protected-abstract-set',
                'protected-instance-get',
                'protected-instance-set'
              ],
              [
                'public-abstract-get',
                'public-abstract-set',
                'public-instance-get',
                'public-instance-set'
              ],
              // instance method
              'private-instance-method',
              ['protected-abstract-method', 'protected-instance-method'],
              ['public-abstract-method', 'public-instance-method']
            ]
          }
        }
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'interface',
          format: ['PascalCase', 'UPPER_CASE'],
          leadingUnderscore: 'allowSingleOrDouble',
          trailingUnderscore: 'allowSingleOrDouble',
          custom: {
            regex: '^(I|Interface)[A-Z]',
            match: false
          }
        }
      ],

      //#endregion

      //#region jshow

      'jshow/explicit-member-accessibility': 'error',
      'jshow/unused-import': 'error',
      'jshow/unused-variable': 'error',
      'jshow/sort-import': 'error',
      'jshow/sort-export': 'error'

      //#endregion

      //#endregion
    }
  },
  {
    files: ['*.js'],
    rules: {
      'no-restricted-globals': 'off',
      '@typescript-eslint/no-var-requires': 'off'
    }
  }
);

export default legacyConfigs;
