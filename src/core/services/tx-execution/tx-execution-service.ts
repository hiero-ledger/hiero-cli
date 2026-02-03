/**
 * Real implementation of Signing Service
 * Uses Hedera SDK to sign and execute transactions
 */
import type {
  Client,
  ContractCreateFlow,
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
    const payer = this.networkService.getPayer();

    // If payer is set but transaction is already frozen, we cannot set TransactionId
    // This would result in transaction being executed with operator instead of payer
    if (payer && transaction.isFrozen()) {
      throw new Error(
        `[TX-EXECUTION] Transaction is already frozen before setting requested payer of the transaction`,
      );
    }

    if (payer && !transaction.isFrozen()) {
      const payerAccountId = AccountId.fromString(payer.accountId);
      const transactionId = TransactionId.generate(payerAccountId);
      transaction.setTransactionId(transactionId);
      this.logger.debug(
        `[TX-EXECUTION] Set transaction payer account ID: ${payer.accountId}`,
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

    if (payer && !uniqueKeyRefIds.has(payer.keyRefId)) {
      this.logger.debug(
        `[TX-EXECUTION] Signing with payer key: ${payer.keyRefId}`,
      );
      await this.kms.signTransaction(transaction, payer.keyRefId);
    }

    return this.executeAndParseReceipt(transaction, client);
  }

  async signAndExecuteContractCreateFlowWith(
    transaction: ContractCreateFlow,
    keyRefIds: string[],
  ): Promise<TransactionResult> {
    this.logger.debug(`[TX-EXECUTION] Signing with ${keyRefIds.length} key(s)`);

    const client = this.getClient();

    const uniqueKeyRefIds = new Set<string>(keyRefIds);

    for (const keyRefId of uniqueKeyRefIds) {
      this.logger.debug(`[TX-EXECUTION] Signing with key: ${keyRefId}`);
      this.kms.signContractCreateFlow(transaction, keyRefId);
    }

    return this.executeContractCreateFlowAndParseReceipt(transaction, client);
  }

  /** Execute transaction and parse receipt (shared by signAndExecute and signAndExecuteWith) */
  private async executeAndParseReceipt(
    transaction: HederaTransaction,
    client: Client,
  ): Promise<TransactionResult> {
    try {
      const response: TransactionResponse = await transaction.execute(client);
      return await this.processTransactionResponse(response, client);
    } catch (error) {
      this.logger.error(
        `[TX-EXECUTION] Transaction execution failed: ${error?.toString()}`,
      );
      throw error;
    } finally {
      client.close();
    }
  }

  /** Execute contract create flow and parse receipt (shared by signAndExecute and signAndExecuteWith) */
  private async executeContractCreateFlowAndParseReceipt(
    transaction: ContractCreateFlow,
    client: Client,
  ): Promise<TransactionResult> {
    try {
      const response: TransactionResponse = await transaction.execute(client);
      return await this.processTransactionResponse(response, client);
    } catch (error) {
      this.logger.error(
        `[TX-EXECUTION] Transaction execution failed: ${error?.toString()}`,
      );
      throw error;
    } finally {
      client.close();
    }
  }

  private async processTransactionResponse(
    response: TransactionResponse,
    client: Client,
  ): Promise<TransactionResult> {
    const receipt: TransactionReceipt = await response.getReceipt(client);
    const record = await response.getRecord(client);

    const consensusTimestamp = record.consensusTimestamp.toDate().toISOString();

    this.logger.debug(
      `[TX-EXECUTION] Transaction executed successfully: ${response.transactionId.toString()}`,
    );

    let accountId: string | undefined;
    let tokenId: string | undefined;
    let topicId: string | undefined;
    let topicSequenceNumber: number | undefined;
    let serials: string[] | undefined;
    let contractId: string | undefined;

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

    if (receipt.contractId) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      contractId = receipt.contractId.toString();
    }

    return {
      transactionId: response.transactionId.toString(),
      success: receipt.status === Status.Success,
      consensusTimestamp,
      accountId,
      tokenId,
      topicId,
      contractId,
      topicSequenceNumber,
      receipt: {
        status: {
          status: receipt.status === Status.Success ? 'success' : 'failed',
          transactionId: response.transactionId.toString(),
        },
        serials,
      },
    };
  }
}
