import explicitMemberAccessibility from './explicit-member-accessibility';
import sortExport from './sort-export';
import sortImport from './sort-import';
import unusedImport from './unused-import';
import unusedVariable from './unused-variable';

/**
 * 规则清单：外层插件入口只需同步更新此对象即可。
 */
export const rules = {
  [explicitMemberAccessibility.name]: explicitMemberAccessibility.rule,
  [sortExport.name]: sortExport.rule,
  [sortImport.name]: sortImport.rule,
  [unusedImport.name]: unusedImport.rule,
  [unusedVariable.name]: unusedVariable.rule
};
