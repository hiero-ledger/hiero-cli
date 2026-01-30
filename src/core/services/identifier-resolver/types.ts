import type { AliasType } from '@/core/services/alias/alias-service.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';

export interface ResolveEntityParams {
  entityIdOrAlias: string;
  type: AliasType;
  network: SupportedNetwork;
}

export interface ResolveEntityResult {
  entityId: string;
}
