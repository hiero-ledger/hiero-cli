import type {
  AccountIdWithPrivateKey,
  KeyOrAccountAlias,
} from '@/core/schemas';
import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { KmsService } from '@/core/services/kms/kms-service.interface';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type { NetworkService } from '@/core/services/network/network-service.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type {
  KeyResolverService,
  ResolvedKey,
} from './key-resolver-service.interface';

import { AliasType } from '@/core/services/alias/alias-service.interface';
import { HederaMirrornodeServiceDefaultImpl } from '@/core/services/mirrornode/hedera-mirrornode-service';

import { ERROR_MESSAGES } from './error-messages';

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
    targetNetwork?: SupportedNetwork,
  ): Promise<ResolvedKey> {
    const argType = keyOrAlias.type;

    if (argType === 'keypair') {
      return this.resolveKeypair(keyOrAlias, keyManager, labels, targetNetwork);
    }

    return this.resolveAlias(keyOrAlias.alias);
  }

  public async getOrInitKeyWithFallback(
    keyOrAlias: KeyOrAccountAlias | undefined,
    keyManager: KeyManagerName,
    labels?: string[],
    targetNetwork?: SupportedNetwork,
  ): Promise<ResolvedKey> {
    if (!keyOrAlias) {
      const operator = this.network.getCurrentOperatorOrThrow();

      const operatorPublicKey = this.kms.getPublicKey(operator.keyRefId);

      if (!operatorPublicKey) {
        throw new Error(ERROR_MESSAGES.invalidOperatorInState);
      }

      return {
        publicKey: operatorPublicKey,
        accountId: operator.accountId,
        keyRefId: operator.keyRefId,
      };
    }

    return this.getOrInitKey(keyOrAlias, keyManager, labels, targetNetwork);
  }

  private resolveAlias(accountAlias: string): ResolvedKey {
    const currentNetwork = this.network.getCurrentNetwork();

    const account = this.alias.resolve(
      accountAlias,
      AliasType.Account,
      currentNetwork,
    );

    if (!account) {
      throw new Error(ERROR_MESSAGES.noAccountAssociatedWithName);
    }

    if (!account.publicKey || !account.keyRefId || !account.entityId) {
      throw new Error(ERROR_MESSAGES.accountMissingPrivatePublicKey);
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
    targetNetwork?: SupportedNetwork,
  ): Promise<ResolvedKey> {
    const { accountId, privateKey } = keyPair;

    const mirror =
      targetNetwork && targetNetwork !== this.network.getCurrentNetwork()
        ? new HederaMirrornodeServiceDefaultImpl(targetNetwork)
        : this.mirror;

    const { keyAlgorithm, accountPublicKey } =
      await mirror.getAccount(accountId);

    if (!keyAlgorithm || !accountPublicKey) {
      throw new Error(ERROR_MESSAGES.unableToGetKeyAlgorithm);
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
