import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { KmsService } from '@/core/services/kms/kms-service.interface';
import type {
  AccountIdWithPrivateKey,
  KeyManagerName,
  KeyOrAccountAlias,
} from '@/core/services/kms/kms-types.interface';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type { NetworkService } from '@/core/services/network/network-service.interface';
import type {
  KeyResolverService,
  ResolvedKey,
} from './key-resolver-service.interface';

import { NotFoundError, StateError } from '@/core/errors';
import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';

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
        throw new StateError(
          'Operator exists in state but missing public key',
          {
            context: {
              accountId: operator.accountId,
              keyRefId: operator.keyRefId,
            },
          },
        );
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
      ALIAS_TYPE.Account,
      currentNetwork,
    );

    if (!account) {
      throw new NotFoundError(`Account alias not found: ${accountAlias}`, {
        context: { alias: accountAlias, network: currentNetwork },
      });
    }

    if (!account.publicKey || !account.keyRefId || !account.entityId) {
      throw new StateError(
        'Account alias exists but missing required key data',
        {
          context: {
            alias: accountAlias,
            hasPublicKey: !!account.publicKey,
            hasKeyRefId: !!account.keyRefId,
            hasEntityId: !!account.entityId,
          },
        },
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

    const accountData = await this.mirror.getAccount(accountId);

    const { keyAlgorithm, accountPublicKey } = accountData;

    if (!keyAlgorithm || !accountPublicKey) {
      throw new StateError(
        'Mirror node returned account but missing key data',
        {
          context: {
            accountId,
            hasKeyAlgorithm: !!keyAlgorithm,
            hasAccountPublicKey: !!accountPublicKey,
          },
        },
      );
    }

    const keyData = this.kms.importAndValidatePrivateKey(
      keyAlgorithm,
      privateKey,
      accountPublicKey,
      keyManager,
      labels,
    );

    return {
      accountId,
      publicKey: keyData.publicKey,
      keyRefId: keyData.keyRefId,
    };
  }
}
