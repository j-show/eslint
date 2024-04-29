/* eslint-disable no-restricted-globals */

module.exports = {
  root: true,
  extends: ['plugin:jshow/typescript'],
  plugins: ['jshow'],
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
