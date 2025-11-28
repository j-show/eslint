import { Linter } from 'eslint';

import browser from './browser';
import node from './node';
import react from './react';
import typescript from './typescript';
import vue from './vue';

type ConfigKey = 'typescript' | 'browser' | 'node' | 'react' | 'vue';

const config: Record<ConfigKey, Linter.Config[]> = {
  typescript,
  browser,
  node,
  react,
  vue
};

export default config;
