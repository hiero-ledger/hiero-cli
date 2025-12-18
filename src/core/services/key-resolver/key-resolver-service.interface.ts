import type { KeyOrAccountAlias } from '@/core/schemas';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';

export type ResolvedKey = {
  publicKey: string;
  accountId: string;
  keyRefId: string;
};

export interface KeyResolverService {
  getOrInitKey(
    keyOrAlias: KeyOrAccountAlias,
    keyManager: KeyManagerName,
    labels?: string[],
    targetNetwork?: SupportedNetwork,
  ): Promise<ResolvedKey>;

  getOrInitKeyWithFallback(
    keyOrAlias: KeyOrAccountAlias | undefined,
    keyManager: KeyManagerName,
    labels?: string[],
    targetNetwork?: SupportedNetwork,
  ): Promise<ResolvedKey>;
}
