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

export interface TokenCreateFtKeys {
  treasury: ResolvedAccountCredential;
  admin: ResolvedPublicKey[];
  supply: ResolvedPublicKey[];
  freeze: ResolvedPublicKey[];
  wipe: ResolvedPublicKey[];
  kyc: ResolvedPublicKey[];
  pause: ResolvedPublicKey[];
  feeSchedule: ResolvedPublicKey[];
  metadata: ResolvedPublicKey[];
}

export interface TokenCreateFtFromFileKeys {
  treasury: ResolvedAccountCredential;
  adminKeys: ResolvedPublicKey[];
  supplyKeys: ResolvedPublicKey[];
  wipeKeys: ResolvedPublicKey[];
  kycKeys: ResolvedPublicKey[];
  freezeKeys: ResolvedPublicKey[];
  pauseKeys: ResolvedPublicKey[];
  feeScheduleKeys: ResolvedPublicKey[];
  metadataKeys: ResolvedPublicKey[];
  keyRefIds: string[];
}

export interface TokenUpdatedTreasuryParams {
  explicitKey?: Credential;
  treasuryAccountId: string;
  keyManager: KeyManager;
}

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
