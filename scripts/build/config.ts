import { ROOT_PKG, buildPackage } from '../utils';

buildPackage(
  'config',
  'eslint-config-jshow',
  process.env.TARGET_VERSION || ROOT_PKG.version || '0.0.1'
);
