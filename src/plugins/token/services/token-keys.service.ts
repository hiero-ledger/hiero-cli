import type { KeyResolverService } from '@/core/services/key-resolver/key-resolver-service.interface';
import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';
import type {
  Credential,
  KeyManager,
} from '@/core/services/kms/kms-types.interface';
import type { TokenKeysService } from '@/plugins/token/services/token-keys.service.interface';

export class TokenKeysServiceImpl implements TokenKeysService {
  constructor(
    private readonly keyResolver: KeyResolverService,
    private readonly keyManager: KeyManager,
  ) {}

  async resolveOptionalKeys(
    credentials: Credential[],
    tag: string,
  ): Promise<ResolvedPublicKey[]> {
    const results: ResolvedPublicKey[] = [];
    for (const credential of credentials) {
      const resolved = await this.keyResolver.resolveSigningKey(
        credential,
        this.keyManager,
        false,
        [tag],
      );
      results.push(resolved);
    }
    return results;
  }

  async resolveOptionalKey(
    credential: Credential | undefined,
    tag: string,
  ): Promise<ResolvedPublicKey | undefined> {
    if (!credential) {
      return undefined;
    }
    return this.keyResolver.getPublicKey(credential, this.keyManager, false, [
      tag,
    ]);
  }
}
