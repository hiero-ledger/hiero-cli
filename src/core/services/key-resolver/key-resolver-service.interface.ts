import { KeyOrAccountAlias } from '../../schemas';
import { KeyManagerName } from '../kms/kms-types.interface';

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
  ): Promise<ResolvedKey>;

  getOrInitKeyWithFallback(
    keyOrAlias: KeyOrAccountAlias | undefined,
    keyManager: KeyManagerName,
    labels?: string[],
  ): Promise<ResolvedKey>;
}
