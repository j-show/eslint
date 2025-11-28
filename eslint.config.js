import jshowConfig from 'eslint-config-jshow';
import prettierConfig from 'eslint-config-prettier';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  ...jshowConfig.node,
  prettierConfig,
  prettierRecommended,
  {
    ignores: [
      'dist',
      'node_modules',
      'build',
      'coverage',
      'dist-ssr',
      'public',
      'static',
      'test',
      'tests',
      'tmp',
      'temp',
      'tmp/**',
      'temp/**'
    ]
  },
  {
    rules: {
      'prettier/prettier': 'error'
    }
  }
];
