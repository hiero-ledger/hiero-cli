import type {
  Client,
  ContractCreateFlow,
  Transaction as HederaTransaction,
} from '@hiero-ledger/sdk';
import type { KeyAlgorithm } from '@/core/shared/constants';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { KeyManager, KmsCredentialRecord } from './kms-types.interface';
import type { Signer } from './signers/signer.interface';

export interface KmsService {
  /**
   * Creates a new private key using specified KeyManager.
   *
   * @param keyManager - KeyManager to use ('local' or 'local_encrypted')
   * @param labels - Optional labels for the key
   * @returns keyRefId and publicKey
   */
  createLocalPrivateKey(
    keyType: KeyAlgorithm,
    keyManager?: KeyManager,
    labels?: string[],
  ): {
    keyRefId: string;
    publicKey: string;
  };
  importPublicKey(
    keyType: KeyAlgorithm,
    publicKeyRaw: string,
    keyManager?: KeyManager,
    labels?: string[],
  ): { keyRefId: string; publicKey: string };

  /**
   * Imports an existing private key using specified KeyManager.
   *
   * @param keyType - Key algorithm type
   * @param privateKey - Private key string to import
   * @param keyManager - KeyManager to use ('local' or 'local_encrypted')
   * @param labels - Optional labels for the key
   * @returns keyRefId and publicKey
   */
  importPrivateKey(
    keyType: KeyAlgorithm,
    privateKey: string,
    keyManager?: KeyManager,
    labels?: string[],
  ): { keyRefId: string; publicKey: string };

  /**
   * Imports an existing private key and validates it against the public key from mirror node.
   *
   * @param keyType - Key algorithm type
   * @param privateKey - Private key string to import
   * @param validationPublicKey - The public key that should be associated with the given privateKey, used for validation.
   * @param keyManager - KeyManager to use ('local' or 'local_encrypted')
   * @param labels - Optional labels for the key
   * @returns keyRefId and publicKey
   */
  importAndValidatePrivateKey(
    keyType: KeyAlgorithm,
    privateKey: string,
    validationPublicKey: string,
    keyManager?: KeyManager,
    labels?: string[],
  ): { keyRefId: string; publicKey: string };

  /**
   * Gets a signer handle for signing transactions.
   */
  getSignerHandle(keyRefId: string): Signer;

  /**
   * Finds keyRefId by public key.
   */
  findByPublicKey(publicKey: string): KmsCredentialRecord | undefined;

  /**
   * Finds keyRefId by public key.
   */
  get(keyRefId: string): KmsCredentialRecord | undefined;

  /**
   * Lists all credential records.
   */
  list(): Array<{
    keyRefId: string;
    keyManager: KeyManager;
    publicKey: string;
    labels?: string[];
  }>;

  /**
   * Removes a credential (both metadata and secret).
   */
  remove(keyRefId: string): void;

  hasPrivateKey(keyRefId: string): boolean;

  /**
   * Creates a Hedera client with operator credentials.
   * @param network - Network to connect to
   */
  createClient(network: SupportedNetwork): Client;

  /**
   * Signs a transaction with specified key.
   */
  signTransaction(
    transaction: HederaTransaction,
    keyRefId: string,
  ): Promise<void>;

  /**
   * Signs a transaction with specified key.
   */
  signContractCreateFlow(
    transaction: ContractCreateFlow,
    keyRefId: string,
  ): void;
}
