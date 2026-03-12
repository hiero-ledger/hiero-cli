import type { EntityReferenceType } from '@/core/types/shared.types';

export interface DeleteTokenNormalizedParams {
  type: EntityReferenceType;
  value: string;
}
