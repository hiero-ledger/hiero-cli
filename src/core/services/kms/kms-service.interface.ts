import type {
  Client,
  ContractCreateFlow,
  Transaction as HederaTransaction,
} from '@hashgraph/sdk';
import type { KeyAlgorithm } from '@/core/shared/constants';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { KeyManagerName } from './kms-types.interface';
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
    keyManager?: KeyManagerName,
    labels?: string[],
  ): {
    keyRefId: string;
    publicKey: string;
  };

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
    keyManager?: KeyManagerName,
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
    keyManager?: KeyManagerName,
    labels?: string[],
  ): { keyRefId: string; publicKey: string };

  /**
   * Gets public key for a keyRefId.
   */
  getPublicKey(keyRefId: string): string | null;

  /**
   * Gets a signer handle for signing transactions.
   */
  getSignerHandle(keyRefId: string): Signer;

  /**
   * Finds keyRefId by public key.
   */
  findByPublicKey(publicKey: string): string | null;

  /**
   * Lists all credential records.
   */
  list(): Array<{
    keyRefId: string;
    keyManager: KeyManagerName;
    publicKey: string;
    labels?: string[];
  }>;

  /**
   * Removes a credential (both metadata and secret).
   */
  remove(keyRefId: string): void;

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
