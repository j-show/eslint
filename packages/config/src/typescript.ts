import { TSESLint } from '@typescript-eslint/utils';

const config: TSESLint.Linter.Config = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',

    // Exclude prettier-specific rules. Must be last configuration in the extends array
    'prettier',
    'plugin:prettier/recommended'
  ],
  plugins: ['@typescript-eslint', 'prettier', 'simple-import-sort', 'jshow'],

  parser: '@typescript-eslint/parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    sourceType: 'module',
    ecmaVersion: 2020
  },
  env: {
    es2020: true,
    worker: true
  },
  rules: {
    //#region eslint

    'no-console': ['error', { allow: ['warn', 'error', 'info', 'debug'] }],
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
    'no-useless-escape': 'warn',
    'no-use-before-define': 'error',
    'no-var': 'error',

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
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/no-namespace': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/no-this-alias': 'off',

    '@typescript-eslint/no-unnecessary-type-assertion': 'off',
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

    '@typescript-eslint/adjacent-overload-signatures': 'error',
    '@typescript-eslint/await-thenable': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/ban-types': [
      'error',
      {
        types: {
          Object: { message: 'Use {} instead' },
          String: { message: "Use 'string' instead.", fixWith: 'string' },
          Number: { message: "Use 'number' instead.", fixWith: 'number' },
          Boolean: { message: "Use 'boolean' instead.", fixWith: 'boolean' },
          '{}': false,
          Function: false
        }
      }
    ],
    '@typescript-eslint/camelcase': 'off',
    '@typescript-eslint/class-name-casing': [
      'off',
      { allowUnderscorePrefix: true }
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
            // abstract
            ['protected-abstract-get', 'protected-abstract-set'],
            ['public-abstract-get', 'public-abstract-set'],
            'protected-abstract-method',
            'public-abstract-method',
            // instance getter & set
            ['private-instance-get', 'private-instance-set'],
            ['protected-instance-get', 'protected-instance-set'],
            ['public-instance-get', 'public-instance-set'],
            // instance method
            'private-instance-method',
            'protected-instance-method',
            'public-instance-method'
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

    //#endregion

    //#region eslint-plugin-simple-import-sort

    'simple-import-sort/exports': [
      'error',
      {
        groups: [['\\u0000'], ['^@?[a-zA-Z]'], ['^@/'], ['^\\.\\./'], ['^\\./']]
      }
    ],
    'simple-import-sort/imports': [
      'error',
      {
        groups: [['\\u0000'], ['^@?[a-zA-Z]'], ['^@/'], ['^\\.\\./'], ['^\\./']]
      }
    ]

    //#endregion
  },
  overrides: [
    {
      files: ['*.js'],
      rules: {
        'no-restricted-globals': 'off',
        '@typescript-eslint/no-var-requires': 'off'
      }
    }
  ]
};

export = config;
