import type { Logger } from '@/core';
import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type {
  Destination,
  ResolvedAccountCredential,
  ResolvedKey,
  ResolvedPublicKey,
} from '@/core/services/key-resolver/types';
import type { KmsService } from '@/core/services/kms/kms-service.interface';
import type {
  AccountIdCredential,
  AliasCredential,
  Credential,
  EvmAddressCredential,
  KeyManager,
  KeypairCredential,
  KeyReferenceCredential,
  PrivateKeyCredential,
  PublicKeyCredential,
} from '@/core/services/kms/kms-types.interface';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type { NetworkService } from '@/core/services/network/network-service.interface';
import type { KeyResolverService } from './key-resolver-service.interface';

import { NotFoundError, StateError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { CredentialType } from '@/core/services/kms/kms-types.interface';

export class KeyResolverServiceImpl implements KeyResolverService {
  private readonly mirror: HederaMirrornodeService;
  private readonly alias: AliasService;
  private readonly network: NetworkService;
  private readonly kms: KmsService;
  private readonly logger: Logger;

  constructor(
    mirrorNodeService: HederaMirrornodeService,
    aliasService: AliasService,
    networkService: NetworkService,
    kmsService: KmsService,
    logger: Logger,
  ) {
    this.mirror = mirrorNodeService;
    this.alias = aliasService;
    this.network = networkService;
    this.kms = kmsService;
    this.logger = logger;
  }

  public async resolveAccountCredentials(
    credential: Credential | undefined,
    keyManager: KeyManager,
    fallback?: boolean,
    labels?: string[],
  ): Promise<ResolvedAccountCredential> {
    if (!credential && fallback) {
      const resolved = this.resolveOperator();
      return this.assertSigningKey(resolved);
    }
    if (!credential) {
      throw new StateError('Credential is required when fallback is disabled');
    }
    const resolved = await this.resolveCredential(
      credential,
      keyManager,
      labels,
    );
    return this.assertSigningKey(resolved, credential.rawValue);
  }

  public async getPublicKey(
    credential: Credential | undefined,
    keyManager: KeyManager,
    fallback?: boolean,
    labels?: string[],
  ): Promise<ResolvedPublicKey> {
    if (!credential && fallback) {
      const resolved = this.resolveOperator();
      const { keyRefId, publicKey } = resolved;
      return { keyRefId: keyRefId!, publicKey: publicKey! };
    }
    if (!credential) {
      throw new StateError('Credential is required when fallback is disabled');
    }
    const resolved = await this.resolveCredential(
      credential,
      keyManager,
      labels,
    );
    const { keyRefId, publicKey } = resolved;

    if (!keyRefId || !publicKey) {
      throw new StateError(
        'Credential cannot be used as public key: missing publicKey or keyRefId',
        {
          context: { hasKeyRefId: !!keyRefId, hasPublicKey: !!publicKey },
        },
      );
    }

    return { keyRefId, publicKey };
  }

  public async resolveSigningKey(
    credential: Credential | undefined,
    keyManager: KeyManager,
    fallback?: boolean,
    labels?: string[],
  ): Promise<ResolvedPublicKey> {
    if (!credential && fallback) {
      const resolved = this.resolveOperator();
      const { keyRefId, publicKey } = resolved;

      if (!this.kms.hasPrivateKey(keyRefId!)) {
        throw new StateError(
          'Credential cannot be used for signing: no private key available',
          { context: { keyRefId } },
        );
      }

      return { keyRefId: keyRefId!, publicKey: publicKey! };
    }
    if (!credential) {
      throw new StateError('Credential is required when fallback is disabled');
    }
    const resolved = await this.resolveCredential(
      credential,
      keyManager,
      labels,
    );
    const { keyRefId, publicKey } = resolved;

    if (!keyRefId || !publicKey) {
      throw new StateError(
        'Credential cannot be used for signing: missing publicKey or keyRefId',
        {
          context: { hasKeyRefId: !!keyRefId, hasPublicKey: !!publicKey },
        },
      );
    }

    if (!this.kms.hasPrivateKey(keyRefId)) {
      throw new StateError(
        'Credential cannot be used for signing: no private key available',
        { context: { keyRefId, rawValue: credential.rawValue } },
      );
    }

    return { keyRefId, publicKey };
  }

  public async resolveDestination(
    credential: Credential,
    keyManager: KeyManager,
    labels?: string[],
  ): Promise<Destination> {
    const resolved = await this.resolveCredential(
      credential,
      keyManager,
      labels,
    );
    const { accountId, evmAddress } = resolved;

    if (!accountId && !evmAddress) {
      throw new StateError(
        'Credential cannot be used as destination: missing accountId and evmAddress',
        {
          context: { rawValue: credential.rawValue },
        },
      );
    }

    return { accountId, evmAddress } as Destination;
  }

  private resolveCredential(
    credential: Credential,
    keyManager: KeyManager,
    labels?: string[],
  ): Promise<ResolvedKey> {
    switch (credential.type) {
      case CredentialType.ACCOUNT_ID:
        return this.resolveAccountId(credential, keyManager, labels);
      case CredentialType.ACCOUNT_KEY_PAIR:
        return this.resolveAccountKeyPair(credential, keyManager, labels);
      case CredentialType.PRIVATE_KEY:
        return this.resolvePrivateKey(credential, keyManager, labels);
      case CredentialType.PUBLIC_KEY:
        return this.resolvePublicKey(credential, keyManager, labels);
      case CredentialType.KEY_REFERENCE:
        return this.resolveKeyReference(credential);
      case CredentialType.ALIAS:
        return Promise.resolve(this.resolveAlias(credential));
      case CredentialType.EVM_ADDRESS:
        return this.resolveEvmAddress(credential, keyManager, labels);
    }
  }

  private resolveOperator(): ResolvedKey {
    const operator = this.network.getCurrentOperatorOrThrow();
    const operatorPublicKey = this.kms.get(operator.keyRefId)?.publicKey;

    if (!operatorPublicKey) {
      throw new StateError('Operator exists in state but missing public key', {
        context: { accountId: operator.accountId, keyRefId: operator.keyRefId },
      });
    }

    return {
      publicKey: operatorPublicKey,
      accountId: operator.accountId,
      keyRefId: operator.keyRefId,
    };
  }

  private assertSigningKey(
    resolved: ResolvedKey,
    rawValue?: string,
  ): ResolvedAccountCredential {
    const { keyRefId, accountId, publicKey } = resolved;

    if (!keyRefId || !accountId || !publicKey) {
      throw new StateError(
        'Credential cannot be used for signing: missing accountId, publicKey or keyRefId',
        {
          context: {
            hasKeyRefId: !!keyRefId,
            hasAccountId: !!accountId,
            hasPublicKey: !!publicKey,
            rawValue,
          },
        },
      );
    }

    if (!this.kms.hasPrivateKey(keyRefId)) {
      throw new StateError(
        'Credential cannot be used for signing: no private key available',
        { context: { keyRefId, rawValue } },
      );
    }

    return { keyRefId, accountId, publicKey };
  }

  private async resolveAccountId(
    accountIdCredential: AccountIdCredential,
    keyManager: KeyManager,
    labels?: string[],
  ): Promise<ResolvedKey> {
    const { accountId } = accountIdCredential;

    const { keyAlgorithm, accountPublicKey } =
      await this.mirror.getAccount(accountId);

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

    const { keyRefId, publicKey } = this.kms.importPublicKey(
      keyAlgorithm,
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

  private async resolveAccountKeyPair(
    keyPair: KeypairCredential,
    keyManager: KeyManager,
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

  private async resolveKeyReference(
    keyReferenceCredential: KeyReferenceCredential,
  ): Promise<ResolvedKey> {
    const keyReference = this.kms.get(keyReferenceCredential.keyReference);
    if (!keyReference) {
      throw new NotFoundError(
        `Key reference with id ${keyReferenceCredential.keyReference} not found in state`,
      );
    }
    const { accounts } = await this.mirror.getAccounts({
      accountPublicKey: keyReference.publicKey,
    });

    let accountId;
    if (accounts.length == 1) {
      accountId = accounts[0].accountId;
    } else {
      this.logger.warn(
        `There cannot be one single account ID assigned to key as there are ${accounts.length} results from Hedera Mirror Node`,
      );
    }

    return {
      accountId,
      publicKey: keyReference.publicKey,
      keyRefId: keyReference.keyRefId,
    };
  }

  private async resolvePrivateKey(
    privateKeyCredential: PrivateKeyCredential,
    keyManager: KeyManager,
    labels?: string[],
  ): Promise<ResolvedKey> {
    const keyReference = this.kms.importPrivateKey(
      privateKeyCredential.keyType,
      privateKeyCredential.privateKey,
      keyManager,
      labels,
    );
    const { accounts } = await this.mirror.getAccounts({
      accountPublicKey: keyReference.publicKey,
    });
    let accountId;
    if (accounts.length == 1) {
      accountId = accounts[0].accountId;
    } else {
      this.logger.warn(
        `There cannot be one single account ID assigned to key as there are ${accounts.length} results from Hedera Mirror Node`,
      );
    }

    return {
      accountId,
      publicKey: keyReference.publicKey,
      keyRefId: keyReference.keyRefId,
    };
  }

  private async resolvePublicKey(
    publicKeyCredential: PublicKeyCredential,
    keyManager: KeyManager,
    labels?: string[],
  ): Promise<ResolvedKey> {
    const keyReference = this.kms.importPublicKey(
      publicKeyCredential.keyType,
      publicKeyCredential.publicKey,
      keyManager,
      labels,
    );
    const { accounts } = await this.mirror.getAccounts({
      accountPublicKey: keyReference.publicKey,
    });
    let accountId;
    if (accounts.length == 1) {
      accountId = accounts[0].accountId;
    } else {
      this.logger.warn(
        `There cannot be one single account ID assigned to key as there are ${accounts.length} results from Hedera Mirror Node`,
      );
    }

    return {
      accountId,
      publicKey: keyReference.publicKey,
      keyRefId: keyReference.keyRefId,
    };
  }

  private async resolveEvmAddress(
    credential: EvmAddressCredential,
    keyManager: KeyManager,
    labels?: string[],
  ): Promise<ResolvedKey> {
    const { evmAddress } = credential;

    let accountData;
    try {
      accountData = await this.mirror.getAccount(evmAddress);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return { evmAddress };
      }
      throw error;
    }

    const { keyAlgorithm, accountPublicKey, accountId } = accountData;

    if (!keyAlgorithm || !accountPublicKey) {
      return { accountId, evmAddress };
    }

    const { keyRefId, publicKey } = this.kms.importPublicKey(
      keyAlgorithm,
      accountPublicKey,
      keyManager,
      labels,
    );

    return { accountId, evmAddress, publicKey, keyRefId };
  }

  private resolveAlias(aliasCredential: AliasCredential): ResolvedKey {
    const currentNetwork = this.network.getCurrentNetwork();

    const account = this.alias.resolve(
      aliasCredential.alias,
      AliasType.Account,
      currentNetwork,
    );

    if (!account) {
      throw new NotFoundError(
        `Account alias not found: ${aliasCredential.alias}`,
        {
          context: { alias: aliasCredential.alias, network: currentNetwork },
        },
      );
    }

    if (!account.publicKey || !account.keyRefId || !account.entityId) {
      throw new StateError(
        'Account alias exists but missing required key data',
        {
          context: {
            alias: aliasCredential.alias,
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
}
