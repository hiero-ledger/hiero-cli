/**
 * Real implementation of Signing Service
 * Uses Hedera SDK to sign and execute transactions
 */
import {
  TxExecutionService,
  TransactionResult,
} from './tx-execution-service.interface';
import { Logger } from '../logger/logger-service.interface';
import { KmsService } from '../kms/kms-service.interface';
import { NetworkService } from '../network/network-service.interface';
import type { SignerRef } from './tx-execution-service.interface';
import {
  Client,
  TransactionResponse,
  TransactionReceipt,
  Status,
  Transaction as HederaTransaction,
} from '@hashgraph/sdk';

export class TxExecutionServiceImpl implements TxExecutionService {
  private logger: Logger;
  private kms: KmsService;
  private networkService: NetworkService;

  constructor(
    logger: Logger,
    kmsState: KmsService,
    networkService: NetworkService,
  ) {
    this.logger = logger;
    this.kms = kmsState;
    this.networkService = networkService;
  }

  /**
   * Get a fresh Hedera client for the current network
   */
  private getClient(): Client {
    this.logger.debug('[TX-EXECUTION] Creating client for current network');

    // Get current network from NetworkService
    const network = this.networkService.getCurrentNetwork();

    // Use credentials-state to create client without exposing private keys
    return this.kms.createClient(network);
  }

  /**
   * Sign and execute a transaction in one operation
   */
  async signAndExecute(
    transaction: HederaTransaction,
  ): Promise<TransactionResult> {
    this.logger.debug(`[TX-EXECUTION] Signing and executing transaction`);

    try {
      // Get fresh client for current network
      const client = this.getClient();

      // Get operator keyRefId for signing
      const currentNetwork = this.networkService.getCurrentNetwork();
      const operator = this.networkService.getOperator(currentNetwork);
      if (!operator) {
        throw new Error('[TX-EXECUTION] No default operator configured');
      }

      if (!transaction.isFrozen()) {
        transaction.freezeWith(client);
      }

      // Sign using credentials-state without exposing private key
      await this.kms.signTransaction(transaction, operator.keyRefId);

      // Execute the transaction
      const response: TransactionResponse = await transaction.execute(client);
      const receipt: TransactionReceipt = await response.getReceipt(client);

      this.logger.debug(
        `[TX-EXECUTION] Transaction executed successfully: ${response.transactionId.toString()}`,
      );

      // @TODO Extract logic to parse receipt to reuse in method below
      // Extract IDs from receipt based on transaction type
      let accountId: string | undefined;
      let tokenId: string | undefined;
      let topicId: string | undefined;
      let topicSequenceNumber: number | undefined;

      if (receipt.accountId) {
        accountId = receipt.accountId.toString();
      }

      if (receipt.tokenId) {
        tokenId = receipt.tokenId.toString();
      }

      if (receipt.topicId) {
        topicId = receipt.topicId.toString();
      }

      if (receipt.topicSequenceNumber) {
        topicSequenceNumber = Number(receipt.topicSequenceNumber);
      }

      return {
        transactionId: response.transactionId.toString(),
        success: receipt.status === Status.Success,
        accountId,
        tokenId,
        topicId,
        topicSequenceNumber,
        receipt: {
          status: {
            status: receipt.status === Status.Success ? 'success' : 'failed',
            transactionId: response.transactionId.toString(),
          },
        },
      };
    } catch (error) {
      console.error(`[TX-EXECUTION] Transaction execution failed:`, error);
      throw error;
    }
  }

  // New API: minimal delegations to preserve behavior
  async signAndExecuteWith(
    transaction: HederaTransaction,
    signer: SignerRef,
  ): Promise<TransactionResult> {
    // Get fresh client for current network
    const client = this.getClient();
    const keyRefId = this.resolveSignerRef(signer);

    if (!transaction.isFrozen()) {
      transaction.freezeWith(client);
    }

    // Sign using credentials-state without exposing private key
    await this.kms.signTransaction(transaction, keyRefId);

    // Execute the transaction
    const response: TransactionResponse = await transaction.execute(client);
    const receipt: TransactionReceipt = await response.getReceipt(client);

    // Extract IDs from receipt based on transaction type
    let accountId: string | undefined;
    let tokenId: string | undefined;
    let topicId: string | undefined;
    let topicSequenceNumber: number | undefined;

    if (receipt.accountId) {
      accountId = receipt.accountId.toString();
    }

    if (receipt.tokenId) {
      tokenId = receipt.tokenId.toString();
    }

    if (receipt.topicId) {
      topicId = receipt.topicId.toString();
    }

    if (receipt.topicSequenceNumber) {
      topicSequenceNumber = Number(receipt.topicSequenceNumber);
    }

    return {
      transactionId: response.transactionId.toString(),
      success: receipt.status === Status.Success,
      accountId,
      tokenId,
      topicId,
      topicSequenceNumber,
      receipt: {
        status: {
          status: receipt.status === Status.Success ? 'success' : 'failed',
          transactionId: response.transactionId.toString(),
        },
      },
    };
  }

  freezeTx(transaction: HederaTransaction) {
    const client = this.getClient();
    return transaction.freezeWith(client);
  }

  /**
   * Resolve a SignerRef to a keyRefId for signing.
   * Supports both keyRefId and publicKey directly.
   */
  private resolveSignerRef(signer: SignerRef): string {
    if (!signer) throw new Error('[TX-EXECUTION] signer ref is required');

    // If direct keyRefId provided, validate it exists
    if (signer.keyRefId) {
      const pub = this.kms.getPublicKey(signer.keyRefId);
      if (!pub) {
        throw new Error(
          `[TX-EXECUTION] Unknown keyRefId: ${signer.keyRefId}. Use 'hcli keys list' to inspect available keys.`,
        );
      }
      return signer.keyRefId;
    }

    // If publicKey provided, find the corresponding keyRefId
    if (signer.publicKey) {
      const keyRefId = this.kms.findByPublicKey(signer.publicKey);
      if (!keyRefId) {
        throw new Error(
          `[TX-EXECUTION] No keyRefId found for public key: ${signer.publicKey}`,
        );
      }
      return keyRefId;
    }

    throw new Error(
      '[TX-EXECUTION] SignerRef must provide either keyRefId or publicKey',
    );
  }
}
