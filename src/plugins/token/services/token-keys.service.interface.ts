import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';
import type {
  Credential,
  KeyManager,
} from '@/core/services/kms/kms-types.interface';

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
}
