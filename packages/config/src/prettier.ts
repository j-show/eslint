import { type Linter } from 'eslint';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import prettier from 'prettier';

import { buildCompat } from './utils';

const resolveConfig = async (
  cwd: string,
  defaultConfig: object = {}
): Promise<object> => {
  const rc = await prettier.resolveConfig(cwd);
  return rc || defaultConfig;
};

const legacyConfigsFn = async (
  cwd: string,
  defaultConfig: object = {}
): Promise<Linter.Config[]> => {
  const prettierrc = await resolveConfig(cwd, defaultConfig);

  return buildCompat(eslintConfigPrettier, {
    plugins: {
      prettier: eslintPluginPrettier
    },
    rules: {
      'prettier/prettier': ['error', prettierrc]
    }
  });
};

export default legacyConfigsFn;
