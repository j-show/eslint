module.exports = {
  root: true,
  extends: ['jshow/node'],
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
