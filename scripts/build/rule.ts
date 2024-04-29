import { ROOT_PKG, buildPackage } from '../utils';

buildPackage(
  'rule',
  'eslint-plugin-jshow',
  process.env.TARGET_VERSION || ROOT_PKG.version || '0.0.1'
);
