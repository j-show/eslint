import { TSESLint } from '@typescript-eslint/utils';

export const typescript: TSESLint.Linter.Config = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',

    // Exclude prettier-specific rules. Must be last configuration in the extends array
    'prettier',
    'plugin:prettier/recommended',
  ],
  plugins: ['prettier', 'unused-imports', 'simple-import-sort'],

  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
  },
  env: {
    es2020: true,
    node: true,
  },
  rules: {
    'no-restricted-globals': ['error', 'module', 'require'],
    'no-prototype-builtins': 'warn',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-console': ['error', { allow: ['debug', 'warn', 'error', 'info'] }],
    'no-control-regex': 'off',
    'no-useless-escape': 'warn',
    'no-var': 'error',
    'no-constant-condition': 'warn',
    'no-extra-boolean-cast': 'warn',
    'no-fallthrough': 'warn',
    'no-use-before-define': 'off',
    'no-duplicate-imports': 'error',

    'no-restricted-syntax': [
      'error',
      {
        selector: `MemberExpression[property.name="name"]:has(MemberExpressionp[property.name='constructor'])`,
        message:
          'Cannot use `xxx.constructor.name`, because the interpretation of the class name fails after causing confusion.',
      },
    ],

    'prefer-const': ['error', { ignoreReadBeforeAssign: true, destructuring: 'all' }],
    'default-param-last': ['error'],

    '@typescript-eslint/no-empty-function': ['error', { allow: ['arrowFunctions', 'decoratedFunctions'] }],
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/no-namespace': 'off',
    '@typescript-eslint/no-non-null-assertion': ['warn'],
    '@typescript-eslint/no-this-alias': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-unnecessary-type-assertion': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        args: 'none',
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-use-before-define': [
      'warn',
      { functions: false, classes: false, typedefs: false, variables: false },
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
          Function: false,
        },
      },
    ],
    '@typescript-eslint/camelcase': 'off',
    '@typescript-eslint/class-name-casing': ['off', { allowUnderscorePrefix: true }],
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
            'public-instance-method',
          ],
        },
      },
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
          match: false,
        },
      },
    ],

    'simple-import-sort/exports': 'error',
    'simple-import-sort/imports': [
      'error',
      {
        groups: [['\\u0000'], ['^@?[a-zA-Z]'], ['^@/'], ['^\\.\\./'], ['^\\./']],
      },
    ],

    'import/first': 'error',
    'import/newline-after-import': 'error',
    'import/no-duplicates': 'error',
    'import/no-unresolved': 'off',
    'import/no-named-as-default': 'off',

    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'error',
      { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
    ],
  },
  overrides: [
    {
      files: ['*.js'],
      rules: {
        'no-restricted-globals': 'off',
        '@typescript-eslint/no-var-requires': ['off'],
      },
    },
  ],
};
