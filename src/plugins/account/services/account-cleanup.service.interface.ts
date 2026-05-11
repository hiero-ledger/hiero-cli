import type { SupportedNetwork } from '@/core/types/shared.types';
import type {
  AccountDeleteKmsCleanupInput,
  AccountDeleteLocalStateInput,
} from '@/plugins/account/commands/delete/types';

export interface AccountCleanupService {
  removeAccountFromLocalState(
    accountToDelete: AccountDeleteLocalStateInput,
    network: SupportedNetwork,
  ): string[];
  removeKmsCredentialIfUnusedAfterAccountRemoved(
    accountToDelete: AccountDeleteKmsCleanupInput,
  ): void;
}
