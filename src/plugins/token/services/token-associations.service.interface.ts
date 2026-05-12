import type { Credential } from '@/core/services/kms/kms-types.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';

export interface TokenAssociationResult {
  name: string;
  accountId: string;
}

export interface TokenAssociationsService {
  saveAssociationToState(
    tokenId: string,
    accountId: string,
    network: SupportedNetwork,
  ): void;
  removeAssociationFromState(
    tokenId: string,
    accountId: string,
    network: SupportedNetwork,
  ): void;
  processTokenAssociations(
    tokenId: string,
    associations: Credential[],
  ): Promise<TokenAssociationResult[]>;
}
