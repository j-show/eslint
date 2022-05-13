module.exports = {
  tabWidth: 2,
  arrowParens: "always",
  trailingComma: "all",
  quoteProps: "as-needed",
  singleQuote: true,
  bracketSpacing: true,
  jsxSingleQuote: true,
  printWidth: 120,
  overrides: [
    {
      files: "*.ts",
      options: {
        parser: "typescript",
      },
    },
    {
      files: "*.js",
      options: {
        parser: "babel",
      },
    },
    {
      files: "*.json",
      options: {
        parser: "json",
      },
    },
  ],
};
