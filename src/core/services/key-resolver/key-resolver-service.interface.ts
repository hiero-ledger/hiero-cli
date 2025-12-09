import { KeyAlgorithm } from '../../shared/constants';
import { KeyOrAccountAlias } from '../../schemas';
import { PublicKey } from '@hashgraph/sdk';
import { KeyManagerName } from '../kms/kms-types.interface';

export type InputPrivateKey = {
  accountId: string;
  privateKey: string;
};

export type ResolvedPrivateKey = InputPrivateKey & {
  keyAlgorithm: KeyAlgorithm;
};

export type ResolvedKeyOrAlias = {
  publicKey: PublicKey;
  keyRefId: string;
  accountId: string;
};

export interface KeyResolverService {
  verifyAndResolvePrivateKey(key: InputPrivateKey): Promise<ResolvedPrivateKey>;

  resolveKeyOrAlias(
    keyOrAlias: KeyOrAccountAlias,
    keyManager: KeyManagerName,
    labels?: string[],
  ): Promise<ResolvedKeyOrAlias>;

  resolveKeyOrAliasWithFallback(
    keyOrAlias: KeyOrAccountAlias | undefined,
    keyManager: KeyManagerName,
    labels?: string[],
  ): Promise<ResolvedKeyOrAlias>;
}
