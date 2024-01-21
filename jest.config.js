module.exports = {
  verbose: true,
  preset: 'ts-jest',
  rootDir: './test',
  coverageDirectory: './coverage',
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  testEnvironment: 'node',
  testTimeout: 60000,
  testRegex: '(/rules/.*|(\\.|/)(test|spec))\\.ts?$',
  testPathIgnorePatterns: ['/node_modules/'],
  watchPathIgnorePatterns: ['/node_modules/', '/dist/', '/.git/'],
  collectCoverage: false
};
