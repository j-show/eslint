import type { Linter } from 'eslint';

export const buildCompat = (
  ...configs: Array<Linter.Config | Linter.Config[]>
): Linter.Config[] => configs.flat();
