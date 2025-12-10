import { KeyOrAccountAlias } from '../../schemas';
import { PublicKey } from '@hashgraph/sdk';
import { KeyManagerName } from '../kms/kms-types.interface';

export type ResolvedKey = {
  publicKey: PublicKey;
  keyRefId: string;
  accountId: string;
};

export interface KeyResolverService {
  resolveKeyOrAlias(
    keyOrAlias: KeyOrAccountAlias,
    keyManager: KeyManagerName,
    labels?: string[],
  ): Promise<ResolvedKey>;

  resolveKeyOrAliasWithFallback(
    keyOrAlias: KeyOrAccountAlias | undefined,
    keyManager: KeyManagerName,
    labels?: string[],
  ): Promise<ResolvedKey>;
}
