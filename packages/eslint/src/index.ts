import configs from './configs';
import rules from './rules';

const plugin = {
  meta: {
    name: '{TARGET_NAME}',
    version: '{TARGET_VERSION}'
  },
  configs,
  rules
};

export default plugin;
