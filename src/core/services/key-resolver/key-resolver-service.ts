import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { ResolvedKey } from '@/core/services/key-resolver/types';
import type { KmsService } from '@/core/services/kms/kms-service.interface';
import type {
  AccountIdCredential,
  AliasCredential,
  Credential,
  KeyManagerName,
  KeypairCredential,
  KeyReferenceCredential,
  PrivateKeyCredential,
  PublicKeyCredential,
} from '@/core/services/kms/kms-types.interface';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type { NetworkService } from '@/core/services/network/network-service.interface';
import type { KeyResolverService } from './key-resolver-service.interface';

import { NotFoundError, StateError } from '@/core/errors';
import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { CredentialType } from '@/core/services/kms/kms-types.interface';

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
    credential: Credential,
    keyManager: KeyManagerName,
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
        return this.resolveAlias(credential);
    }
  }

  public async getOrInitKeyWithFallback(
    credential: Credential | undefined,
    keyManager: KeyManagerName,
    labels?: string[],
  ): Promise<ResolvedKey> {
    if (!credential) {
      const operator = this.network.getCurrentOperatorOrThrow();

      const operatorPublicKey = this.kms.get(operator.keyRefId)?.publicKey;

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

    return this.getOrInitKey(credential, keyManager, labels);
  }

  private async resolveAccountId(
    accountIdCredential: AccountIdCredential,
    keyManager: KeyManagerName,
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

    return {
      accountId: accounts[0]?.accountId,
      publicKey: keyReference.publicKey,
      keyRefId: keyReference.keyRefId,
    };
  }

  private async resolvePrivateKey(
    privateKeyCredential: PrivateKeyCredential,
    keyManager: KeyManagerName,
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

    return {
      accountId: accounts[0]?.accountId,
      publicKey: keyReference.publicKey,
      keyRefId: keyReference.keyRefId,
    };
  }

  private async resolvePublicKey(
    publicKeyCredential: PublicKeyCredential,
    keyManager: KeyManagerName,
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

    return {
      accountId: accounts[0]?.accountId,
      publicKey: keyReference.publicKey,
      keyRefId: keyReference.keyRefId,
    };
  }

  private resolveAlias(aliasCredential: AliasCredential): ResolvedKey {
    const currentNetwork = this.network.getCurrentNetwork();

    const account = this.alias.resolve(
      aliasCredential.alias,
      ALIAS_TYPE.Account,
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
