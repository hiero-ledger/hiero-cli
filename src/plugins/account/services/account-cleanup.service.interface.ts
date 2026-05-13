import type { SupportedNetwork } from '@/core/types/shared.types';

export interface AccountDeleteLocalStateInput {
  accountId: string;
}

export interface AccountDeleteKmsCleanupInput {
  keyRefId: string;
}

export interface AccountCleanupService {
  removeAccountFromLocalState(
    accountToDelete: AccountDeleteLocalStateInput,
    network: SupportedNetwork,
  ): string[];
  removeKmsCredentialIfUnusedAfterAccountRemoved(
    accountToDelete: AccountDeleteKmsCleanupInput,
  ): void;
}
