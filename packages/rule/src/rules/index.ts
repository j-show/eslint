import explicitMemberAccessibility from './explicit-member-accessibility';
import unusedImport from './unused-import';
import unusedVariable from './unused-variable';

export const rules = {
  [explicitMemberAccessibility.name]: explicitMemberAccessibility.rule,
  [unusedImport.name]: unusedImport.rule,
  [unusedVariable.name]: unusedVariable.rule
};
