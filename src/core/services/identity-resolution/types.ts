import type { AliasType } from '@/core/services/alias/alias-service.interface';
import type {
  EntityReferenceType,
  SupportedNetwork,
} from '@/core/types/shared.types';

export interface AccountResolutionParams {
  accountReference: string;
  type: EntityReferenceType;
  network: SupportedNetwork;
}

export interface AccountResolutionResult {
  accountId: string;
  accountPublicKey: string;
  evmAddress?: string;
}

export interface ContractResolutionParams {
  contractReference: string;
  type: EntityReferenceType;
  network: SupportedNetwork;
}

export interface ContractResolutionResult {
  contractId: string;
  evmAddress?: string;
}

export interface ReferenceResolutionParams {
  entityReference: string;
  referenceType: EntityReferenceType;
  network: SupportedNetwork;
  aliasType: AliasType;
}

export interface ReferenceResolutionResult {
  entityIdOrEvmAddress: string;
}
