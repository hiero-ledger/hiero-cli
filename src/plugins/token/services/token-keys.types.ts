import type {
  ResolvedAccountCredential,
  ResolvedPublicKey,
} from '@/core/services/key-resolver/types';
import type {
  Credential,
  KeyManager,
} from '@/core/services/kms/kms-types.interface';

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
