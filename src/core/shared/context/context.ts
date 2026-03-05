import type { AbstractHook } from '@/core/hooks/abstract-hook';

export interface Context {
  coreActionEnabled: boolean;
  outputPreparationEnabled: boolean;
  hooks?: AbstractHook[];
}
