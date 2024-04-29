module.exports = {
  printWidth: 80,
  tabWidth: 2,
  singleQuote: true,
  bracketSpacing: true,
  endOfLine: 'auto',
  trailingComma: 'none',
  arrowParens: 'avoid',
  overrides: [
    {
      files: '*.md',
      options: {
        parser: 'markdown'
      }
    },
    {
      files: '*.json',
      options: {
        parser: 'json-stringify'
      }
    },
    {
      files: '*.js',
      options: {
        parser: 'babel'
      }
    },
    {
      files: '*.{ts,tsx}',
      options: {
        parser: 'typescript'
      }
    }
  ]
};
