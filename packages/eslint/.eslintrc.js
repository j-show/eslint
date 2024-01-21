/* eslint-disable no-restricted-globals */
const NodeGlobals = ['module', 'require'];

module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',

    'prettier',
    'plugin:prettier/recommended'
  ],
  plugins: ['prettier', 'simple-import-sort'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    sourceType: 'module',
    ecmaVersion: 2020
  },
  env: {
    es2020: true,
    node: true
  },
  rules: {
    'no-case-declarations': 'off',
    'no-prototype-builtins': 'warn',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    'no-control-regex': 'off',
    'no-useless-escape': 'warn',
    'no-var': 'error',
    'no-constant-condition': 'warn',
    'no-extra-boolean-cast': 'warn',
    'no-fallthrough': 'warn',
    'no-use-before-define': 'off',

    'prefer-const': [
      'error',
      { ignoreReadBeforeAssign: true, destructuring: 'all' }
    ],
    'default-param-last': ['error'],

    'prettier/prettier': ['warn'],

    'jsx-a11y/anchor-is-valid': 'off',

    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',

    '@typescript-eslint/no-empty-function': [
      'error',
      { allow: ['arrowFunctions', 'decoratedFunctions'] }
    ],
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/no-namespace': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-this-alias': 'off',
    '@typescript-eslint/no-non-null-assertion': ['warn'],
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-unnecessary-type-assertion': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-use-before-define': [
      'warn',
      { functions: false, classes: false, typedefs: false, variables: false }
    ],

    '@typescript-eslint/unbound-method': ['off', { ignoreStatic: true }],
    '@typescript-eslint/adjacent-overload-signatures': 'error',

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
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-member-accessibility': 'off',
    '@typescript-eslint/camelcase': 'off',
    '@typescript-eslint/await-thenable': 'off',
    '@typescript-eslint/require-await': 'off',

    '@typescript-eslint/class-name-casing': [
      'off',
      { allowUnderscorePrefix: true }
    ]
  },
  overrides: [
    {
      files: ['test/**/*.js'],
      env: { mocha: true }
    }
  ]
};
