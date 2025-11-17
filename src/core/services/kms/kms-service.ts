import { KmsService } from './kms-service.interface';
import {
  KmsCredentialRecord,
  KeyAlgorithm as KeyAlgorithmType,
  CredentialType,
} from './kms-types.interface';
import { KeyAlgorithm } from '../../shared/constants';
import { SupportedNetwork } from '../../types/shared.types';
import { randomBytes } from 'crypto';
import {
  PrivateKey,
  Client,
  PublicKey,
  AccountId,
  Transaction as HederaTransaction,
} from '@hashgraph/sdk';
import { LocalKmsSignerService } from './local-kms-signer.service';
import { KmsSignerService } from './kms-signer-service.interface';
import { Logger } from '../logger/logger-service.interface';
import { StateService } from '../state/state-service.interface';
import { NetworkService } from '../network/network-service.interface';
import { ConfigService } from '../config/config-service.interface';
import { KmsStorageServiceInterface } from './kms-storage-service.interface';
import { KmsStorageService } from './kms-storage.service';

/**
 * @TODO: Consider reorganizing KMS folder structure
 *
 * Currently, the KMS folder contains more files than typical service folders
 * (which usually have just interface + implementation). This was discussed
 * during review and we decided not to change it now, but we should consider
 * better organization in the future.
 *
 */

export class KmsServiceImpl implements KmsService {
  private readonly logger: Logger;
  private readonly storage: KmsStorageServiceInterface;
  private readonly networkService: NetworkService;
  private readonly configService: ConfigService;

  constructor(
    logger: Logger,
    state: StateService,
    networkService: NetworkService,
    configService: ConfigService,
  ) {
    this.logger = logger;
    this.networkService = networkService;
    this.configService = configService;
    this.storage = new KmsStorageService(state);
  }

  createLocalPrivateKey(
    keyType: KeyAlgorithmType,
    labels?: string[],
  ): {
    keyRefId: string;
    publicKey: string;
  } {
    // Check if ED25519 support is enabled when using ED25519 key type
    if (keyType === KeyAlgorithm.ED25519) {
      const ed25519SupportEnabled = this.configService.getOption<boolean>(
        'ed25519_support_enabled',
      );
      if (!ed25519SupportEnabled) {
        throw new Error(
          'ED25519 key type is not enabled. Please enable it by setting the config option ed25519_support_enabled to true.',
        );
      }
    }

    const keyRefId = this.generateId('kr');
    // Generate a real Hedera keypair based on the specified type
    const privateKey =
      keyType === KeyAlgorithm.ECDSA
        ? PrivateKey.generateECDSA()
        : PrivateKey.generateED25519();
    const publicKey = privateKey.publicKey.toStringRaw();
    this.storage.writeSecret(keyRefId, {
      keyAlgorithm: keyType,
      privateKey: privateKey.toStringRaw(),
      createdAt: new Date().toISOString(),
    });
    this.saveRecord({
      keyRefId,
      type: 'localPrivateKey',
      publicKey,
      labels,
      keyAlgorithm: keyType,
    });
    return { keyRefId, publicKey };
  }

  importPrivateKey(
    keyType: KeyAlgorithmType,
    privateKey: string,
    labels?: string[],
  ): { keyRefId: string; publicKey: string } {
    // Check if ED25519 support is enabled when using ED25519 key type
    if (keyType === KeyAlgorithm.ED25519) {
      const ed25519SupportEnabled = this.configService.getOption<boolean>(
        'ed25519_support_enabled',
      );
      if (!ed25519SupportEnabled) {
        throw new Error(
          'ED25519 key type is not enabled. Please enable it by setting the config option ed25519_support_enabled to true.',
        );
      }
    }

    const keyRefId = this.generateId('kr');
    // Parse the key based on the specified type
    const pk: PrivateKey =
      keyType === KeyAlgorithm.ECDSA
        ? PrivateKey.fromStringECDSA(privateKey)
        : PrivateKey.fromStringED25519(privateKey);
    const keyAlgorithm: KeyAlgorithm = keyType;
    const publicKey = pk.publicKey.toStringRaw();

    const existingKeyRefId = this.findByPublicKey(publicKey);
    if (existingKeyRefId) {
      this.logger.debug(
        `[CRED] Passed key already exist, keyRefId: ${existingKeyRefId}`,
      );
      return { keyRefId: existingKeyRefId, publicKey };
    }

    this.saveRecord({
      keyRefId,
      type: 'localPrivateKey',
      publicKey,
      labels,
      keyAlgorithm: keyAlgorithm,
    });
    this.storage.writeSecret(keyRefId, {
      keyAlgorithm,
      privateKey,
      createdAt: new Date().toISOString(),
    });
    return { keyRefId, publicKey };
  }

  getPublicKey(keyRefId: string): string | null {
    return this.getRecord(keyRefId)?.publicKey || null;
  }

  getSignerHandle(keyRefId: string): KmsSignerService {
    const rec = this.getRecord(keyRefId);
    if (!rec) throw new Error(`Unknown keyRefId: ${keyRefId}`);

    // Directly create signer service - no provider needed
    return new LocalKmsSignerService(rec.publicKey, {
      keyRefId,
      storage: this.storage,
      keyAlgorithm: rec.keyAlgorithm,
    });
  }

  findByPublicKey(publicKey: string): string | null {
    const records = this.storage.list();
    const record = records.find((r) => r.publicKey === publicKey);
    return record?.keyRefId || null;
  }

  // Plugin compatibility methods
  list(): Array<{
    keyRefId: string;
    type: CredentialType;
    publicKey: string;
    labels?: string[];
  }> {
    const records = this.storage.list();
    return records.map(({ keyRefId, type, publicKey, labels }) => ({
      keyRefId,
      type,
      publicKey,
      labels,
    }));
  }

  remove(keyRefId: string): void {
    this.storage.remove(keyRefId);
    this.logger.debug(`[CRED] Removed keyRefId=${keyRefId}`);
  }

  // Removed registerProvider - no longer needed

  createClient(network: SupportedNetwork): Client {
    const operator = this.networkService.getOperator(network);
    if (!operator) {
      throw new Error(`[CRED] No operator configured for network: ${network}`);
    }

    const { accountId, keyRefId } = operator;
    const privateKeyString = this.getPrivateKeyString(keyRefId);
    if (!privateKeyString) {
      throw new Error('[CRED] Default operator keyRef missing private key');
    }

    // Get the key algorithm from the record
    const record = this.getRecord(keyRefId);
    if (!record) {
      throw new Error('[CRED] Default operator keyRef record not found');
    }

    // Create client and set operator with credentials
    let client: Client;
    switch (network) {
      case 'mainnet':
        client = Client.forMainnet();
        break;
      case 'testnet':
        client = Client.forTestnet();
        break;
      case 'previewnet':
        client = Client.forPreviewnet();
        break;
      case 'localnet': {
        // For localnet, get configuration from NetworkService
        const localnetConfig = this.networkService.getLocalnetConfig();

        const node = {
          [localnetConfig.localNodeAddress]: AccountId.fromString(
            localnetConfig.localNodeAccountId,
          ),
        };
        client = Client.forNetwork(node);

        if (localnetConfig.localNodeMirrorAddressGRPC) {
          client.setMirrorNetwork(localnetConfig.localNodeMirrorAddressGRPC);
        }
        break;
      }
      default:
        throw new Error(`[CRED] Unsupported network: ${String(network)}`);
    }

    const accountIdObj = AccountId.fromString(accountId);

    // Use the correct PrivateKey.fromString method based on algorithm
    const privateKey =
      record.keyAlgorithm === KeyAlgorithm.ED25519
        ? PrivateKey.fromStringED25519(privateKeyString)
        : PrivateKey.fromStringECDSA(privateKeyString);

    // Set the operator on the client
    client.setOperator(accountIdObj, privateKey);

    return client;
  }

  async signTransaction(
    transaction: HederaTransaction,
    keyRefId: string,
  ): Promise<void> {
    const handle = this.getSignerHandle(keyRefId);
    const publicKey = PublicKey.fromString(handle.getPublicKey());

    // Use the opaque signer handle for signing
    await transaction.signWith(publicKey, async (message: Uint8Array) =>
      handle.sign(message),
    );
  }

  private getPrivateKeyString(keyRefId: string): string | null {
    const secret = this.storage.readSecret(keyRefId);
    return secret?.privateKey || null;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${randomBytes(8).toString('hex')}`;
  }

  private saveRecord(record: KmsCredentialRecord): void {
    this.storage.set(record.keyRefId, record);
    this.logger.debug(
      `[CRED] Saved keyRefId=${record.keyRefId} type=${record.type}`,
    );
  }

  private getRecord(keyRefId: string): KmsCredentialRecord | undefined {
    return this.storage.get(keyRefId);
  }
}
