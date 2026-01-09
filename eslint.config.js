import jshowConfig from 'eslint-config-jshow';

const prettierConfigs = await jshowConfig.prettier(process.cwd());

export default [
  ...jshowConfig.node,
  ...prettierConfigs,
  {
    ignores: ['dist', 'node_modules', 'build', 'coverage', 'test']
  }
];
