import type {
  ResolvedAccountCredential,
  ResolvedPublicKey,
} from '@/core/services/key-resolver/types';
import type {
  Credential,
  KeyManager,
} from '@/core/services/kms/kms-types.interface';
import type { TokenCreateFtInput } from '@/plugins/token/commands/create-ft/input';
import type { FungibleTokenFileDefinition } from '@/plugins/token/schema';
import type {
  TokenCreateFtFromFileKeys,
  TokenCreateFtKeys,
  TokenUpdatedTreasuryParams,
} from '@/plugins/token/services/token-keys.types';

export interface TokenKeysService {
  resolveOptionalKeys(
    credentials: Credential[],
    keyManager: KeyManager,
    tag: string,
  ): Promise<ResolvedPublicKey[]>;
  resolveOptionalKey(
    credential: Credential | undefined,
    keyManager: KeyManager,
    tag: string,
  ): Promise<ResolvedPublicKey | undefined>;
  resolveCreateFtKeys(
    input: TokenCreateFtInput,
    keyManager: KeyManager,
  ): Promise<TokenCreateFtKeys>;
  resolveCreateFtFromFileKeys(
    tokenDefinition: FungibleTokenFileDefinition,
    keyManager: KeyManager,
  ): Promise<TokenCreateFtFromFileKeys>;
  resolveUpdatedTreasury(
    params: TokenUpdatedTreasuryParams,
  ): Promise<ResolvedAccountCredential>;
}
