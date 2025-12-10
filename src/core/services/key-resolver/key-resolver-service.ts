import {
  KeyResolverService,
  ResolvedKey,
} from './key-resolver-service.interface';
import { HederaMirrornodeService } from '../mirrornode/hedera-mirrornode-service.interface';
import { AccountIdWithPrivateKey, KeyOrAccountAlias } from '../../schemas';
import { AliasService, AliasType } from '../alias/alias-service.interface';
import { NetworkService } from '../network/network-service.interface';
import { KmsService } from '../kms/kms-service.interface';
import { KeyManagerName } from '../kms/kms-types.interface';

export class KeyResolverServiceImpl implements KeyResolverService {
  private readonly mirror: HederaMirrornodeService;
  private readonly alias: AliasService;
  private readonly network: NetworkService;
  private readonly kms: KmsService;

  constructor(
    mirrorNodeService: HederaMirrornodeService,
    aliasService: AliasService,
    networkService: NetworkService,
    kmsService: KmsService,
  ) {
    this.mirror = mirrorNodeService;
    this.alias = aliasService;
    this.network = networkService;
    this.kms = kmsService;
  }

  public async getOrInitKey(
    keyOrAlias: KeyOrAccountAlias,
    keyManager: KeyManagerName,
    labels?: string[],
  ): Promise<ResolvedKey> {
    const argType = keyOrAlias.type;

    if (argType === 'keypair') {
      return this.resolveKeypair(keyOrAlias, keyManager, labels);
    }

    return this.resolveAlias(keyOrAlias.alias);
  }

  public async getOrInitKeyWithFallback(
    keyOrAlias: KeyOrAccountAlias | undefined,
    keyManager: KeyManagerName,
    labels?: string[],
  ): Promise<ResolvedKey> {
    if (!keyOrAlias) {
      const operator = this.network.getCurrentOperatorOrThrow();

      const operatorPublicKey = this.kms.getPublicKey(operator.keyRefId);

      if (!operatorPublicKey) {
        throw new Error('Invalid operator in state, missing publicKey');
      }

      return {
        publicKey: operatorPublicKey,
        accountId: operator.accountId,
        keyRefId: operator.keyRefId,
      };
    }

    return this.getOrInitKey(keyOrAlias, keyManager, labels);
  }

  private resolveAlias(accountAlias: string): ResolvedKey {
    const currentNetwork = this.network.getCurrentNetwork();

    const account = this.alias.resolve(
      accountAlias,
      AliasType.Account,
      currentNetwork,
    );

    if (!account) {
      throw new Error('No account is associated with the name provided.');
    }

    if (!account.publicKey || !account.keyRefId || !account.entityId) {
      throw new Error(
        'The account associated with the alias does not have an associated private/public key or accountId',
      );
    }

    return {
      accountId: account.entityId,
      publicKey: account.publicKey,
      keyRefId: account.keyRefId,
    };
  }

  private async resolveKeypair(
    keyPair: AccountIdWithPrivateKey,
    keyManager: KeyManagerName,
    labels?: string[],
  ): Promise<ResolvedKey> {
    const { accountId, privateKey } = keyPair;

    const { keyAlgorithm, accountPublicKey } =
      await this.mirror.getAccount(accountId);

    if (!keyAlgorithm || !accountPublicKey) {
      throw new Error(
        'Unable to get keyAlgorithm or publicKey from mirror node',
      );
    }

    const { keyRefId, publicKey } = this.kms.importAndValidatePrivateKey(
      keyAlgorithm,
      privateKey,
      accountPublicKey,
      keyManager,
      labels,
    );

    return {
      accountId,
      publicKey,
      keyRefId,
    };
  }
}
