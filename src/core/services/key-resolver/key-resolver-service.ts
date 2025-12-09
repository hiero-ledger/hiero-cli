import {
  InputPrivateKey,
  KeyResolverService,
  ResolvedKeyOrAlias,
} from './key-resolver-service.interface';
import { HederaMirrornodeService } from '../mirrornode/hedera-mirrornode-service.interface';
import { KeyOrAccountAlias } from '../../schemas';
import { AliasService, AliasType } from '../alias/alias-service.interface';
import { PrivateKey, PublicKey } from '@hashgraph/sdk';
import { KeyAlgorithm } from '../../shared/constants';
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

  public async verifyAndResolvePrivateKey(key: InputPrivateKey) {
    const account = await this.mirror.getAccount(key.accountId);
    const keyAlgorithm = account.keyAlgorithm;
    const mirrorPublicKey = account.accountPublicKey;

    if (!keyAlgorithm || !mirrorPublicKey) {
      throw new Error('Invalid accountId');
    }

    const privateKey = this.createPrivateKey(keyAlgorithm, key.privateKey);
    const inputPublicKey = privateKey.publicKey.toStringRaw();

    if (mirrorPublicKey !== inputPublicKey) {
      throw new Error("Given accountId doesn't correspond with private key");
    }

    const rawPrivateKey = privateKey.toStringRaw();

    return {
      keyAlgorithm,
      privateKey: rawPrivateKey,
      accountId: key.accountId,
    };
  }

  public async resolveKeyOrAlias(
    keyOrAlias: KeyOrAccountAlias,
    keyManager: KeyManagerName,
    labels?: string[],
  ): Promise<ResolvedKeyOrAlias> {
    const argType = keyOrAlias.type;

    if (argType === 'keypair') {
      const key = {
        accountId: keyOrAlias.accountId,
        privateKey: keyOrAlias.privateKey,
      };
      const resolvedKey = await this.verifyAndResolvePrivateKey(key);

      const { keyRefId } = this.kms.importPrivateKey(
        resolvedKey.keyAlgorithm,
        resolvedKey.privateKey,
        keyManager,
        labels,
      );

      const privateKey = this.createPrivateKey(
        resolvedKey.keyAlgorithm,
        resolvedKey.privateKey,
      );

      return {
        accountId: keyOrAlias.accountId,
        publicKey: privateKey.publicKey,
        keyRefId,
      };
    }

    const currentNetwork = this.network.getCurrentNetwork();

    const account = this.alias.resolve(
      keyOrAlias.alias,
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

    const publicKey = PublicKey.fromString(account.publicKey);
    return {
      accountId: account.entityId,
      publicKey: publicKey,
      keyRefId: account.keyRefId,
    };
  }

  public async resolveKeyOrAliasWithFallback(
    keyOrAlias: KeyOrAccountAlias | undefined,
    keyManager: KeyManagerName,
    labels?: string[],
  ): Promise<ResolvedKeyOrAlias> {
    if (!keyOrAlias) {
      const operator = this.network.getCurrentOperatorOrThrow();

      const operatorPublicKey = this.kms.getPublicKey(operator.keyRefId);

      if (!operatorPublicKey) {
        throw new Error('Invalid operator in state, missing publicKey');
      }

      return {
        publicKey: PublicKey.fromString(operatorPublicKey),
        keyRefId: operator.keyRefId,
        accountId: operator.accountId,
      };
    }

    return this.resolveKeyOrAlias(keyOrAlias, keyManager, labels);
  }

  private createPrivateKey(keyAlgorithm: KeyAlgorithm, privateKey: string) {
    if (keyAlgorithm === KeyAlgorithm.ECDSA) {
      return PrivateKey.fromStringECDSA(privateKey);
    }

    return PrivateKey.fromStringED25519(privateKey);
  }
}
