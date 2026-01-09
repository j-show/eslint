import prettierConfig from 'eslint-config-jshow/prettier';
import jshowConfig from 'eslint-config-jshow/react';

const prettierConfigs = await prettierConfig(process.cwd());

export default [
  ...jshowConfig,
  ...prettierConfigs,
  {
    ignores: [
      'dist',
      'node_modules',
      'build',
      'coverage',
      'public',
      'static',
      'test'
    ]
  }
];
