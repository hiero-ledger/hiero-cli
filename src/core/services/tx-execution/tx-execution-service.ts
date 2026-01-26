/**
 * Real implementation of Signing Service
 * Uses Hedera SDK to sign and execute transactions
 */
import type {
  Client,
  Transaction as HederaTransaction,
  TransactionReceipt,
  TransactionResponse,
} from '@hashgraph/sdk';
import type { KmsService } from '@/core/services/kms/kms-service.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { NetworkService } from '@/core/services/network/network-service.interface';
import type {
  TransactionResult,
  TxExecutionService,
} from './tx-execution-service.interface';

import { AccountId, Status, TransactionId } from '@hashgraph/sdk';

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

  private getClient(): Client {
    this.logger.debug('[TX-EXECUTION] Creating client for current network');
    const network = this.networkService.getCurrentNetwork();
    return this.kms.createClient(network);
  }

  async signAndExecute(
    transaction: HederaTransaction,
  ): Promise<TransactionResult> {
    this.logger.debug(
      `[TX-EXECUTION] Signing and executing transaction with operator`,
    );
    return this.signAndExecuteWith(transaction, []);
  }

  async signAndExecuteWith(
    transaction: HederaTransaction,
    keyRefIds: string[],
  ): Promise<TransactionResult> {
    this.logger.debug(`[TX-EXECUTION] Signing with ${keyRefIds.length} key(s)`);

    const client = this.getClient();
    const payerOverride = this.networkService.getPayerOverrideResolved();

    // If payer override is set but transaction is already frozen, we cannot set TransactionId
    // This would result in transaction being executed with operator instead of payer
    if (payerOverride && transaction.isFrozen()) {
      throw new Error(
        `[TX-EXECUTION] Transaction is already frozen but payer override is set. ` +
          `Cannot set payer account ID. Transaction would be executed with operator instead of payer.`,
      );
    }

    if (payerOverride && !transaction.isFrozen()) {
      const payerAccountId = AccountId.fromString(payerOverride.accountId);
      const transactionId = TransactionId.generate(payerAccountId);
      transaction.setTransactionId(transactionId);
      this.logger.debug(
        `[TX-EXECUTION] Set transaction payer account ID: ${payerOverride.accountId}`,
      );
    }

    if (!transaction.isFrozen()) {
      transaction.freezeWith(client);
    }

    const uniqueKeyRefIds = new Set<string>(keyRefIds);

    for (const keyRefId of uniqueKeyRefIds) {
      this.logger.debug(`[TX-EXECUTION] Signing with key: ${keyRefId}`);
      await this.kms.signTransaction(transaction, keyRefId);
    }

    if (payerOverride && !uniqueKeyRefIds.has(payerOverride.keyRefId)) {
      this.logger.debug(
        `[TX-EXECUTION] Signing with payer key: ${payerOverride.keyRefId}`,
      );
      await this.kms.signTransaction(transaction, payerOverride.keyRefId);
    }

    return this.executeAndParseReceipt(transaction, client);
  }

  /** Execute transaction and parse receipt (shared by signAndExecute and signAndExecuteWith) */
  private async executeAndParseReceipt(
    transaction: HederaTransaction,
    client: Client,
  ): Promise<TransactionResult> {
    try {
      const response: TransactionResponse = await transaction.execute(client);
      const receipt: TransactionReceipt = await response.getReceipt(client);
      const record = await response.getRecord(client);

      const consensusTimestamp = record.consensusTimestamp
        .toDate()
        .toISOString();

      this.logger.debug(
        `[TX-EXECUTION] Transaction executed successfully: ${response.transactionId.toString()}`,
      );

      let accountId: string | undefined;
      let tokenId: string | undefined;
      let topicId: string | undefined;
      let topicSequenceNumber: number | undefined;
      let serials: string[] | undefined;

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

      if (receipt.serials && receipt.serials.length > 0) {
        serials = receipt.serials.map((serial) => serial.toString());
      }

      return {
        transactionId: response.transactionId.toString(),
        success: receipt.status === Status.Success,
        consensusTimestamp,
        accountId,
        tokenId,
        topicId,
        topicSequenceNumber,
        receipt: {
          status: {
            status: receipt.status === Status.Success ? 'success' : 'failed',
            transactionId: response.transactionId.toString(),
          },
          serials,
        },
      };
    } catch (error) {
      this.logger.error(
        `[TX-EXECUTION] Transaction execution failed: ${error?.toString()}`,
      );
      throw error;
    } finally {
      client.close();
    }
  }
}
