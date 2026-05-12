import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';
import type { Credential } from '@/core/services/kms/kms-types.interface';

export interface TokenKeysService {
  resolveOptionalKeys(
    credentials: Credential[],
    tag: string,
  ): Promise<ResolvedPublicKey[]>;
  resolveOptionalKey(
    credential: Credential | undefined,
    tag: string,
  ): Promise<ResolvedPublicKey | undefined>;
}
