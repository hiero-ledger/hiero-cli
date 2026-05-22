import type {
  Credential,
  KeyManager,
} from '@/core/services/kms/kms-types.interface';

export interface TokenAssociationResult {
  name: string;
  accountId: string;
}

export interface TokenAssociationsService {
  processTokenAssociations(
    tokenId: string,
    associations: Credential[],
    keyManager: KeyManager,
  ): Promise<TokenAssociationResult[]>;
}
