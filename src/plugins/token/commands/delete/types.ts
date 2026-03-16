import type { EntityReferenceType } from '@/core/types/shared.types';

export interface TokenDeleteNormalizedParams {
  type: EntityReferenceType;
  value: string;
}
