import type {
  Client,
  ContractCreateFlow,
  Transaction as HederaTransaction,
  TransactionReceipt,
  TransactionResponse,
} from '@hiero-ledger/sdk';
import type { KmsService } from '@/core/services/kms/kms-service.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { NetworkService } from '@/core/services/network/network-service.interface';
import type { TransactionResult } from '@/core/types/shared.types';
import type { TxExecuteService } from './tx-execute-service.interface';

import { PrecheckStatusError, ReceiptStatusError } from '@hiero-ledger/sdk';

import { TransactionError, TransactionPrecheckError } from '@/core/errors';
import { getCauseMessage } from '@/core/utils/get-cause-message';
import { mapReceiptToTransactionResult } from '@/core/utils/receipt-mapper';

export class TxExecuteServiceImpl implements TxExecuteService {
  private logger: Logger;
  private kms: KmsService;
  private networkService: NetworkService;

  constructor(logger: Logger, kms: KmsService, networkService: NetworkService) {
    this.logger = logger;
    this.kms = kms;
    this.networkService = networkService;
  }

  private getClient(): Client {
    const network = this.networkService.getCurrentNetwork();
    return this.kms.createClient(network);
  }

  private wrapTransactionError(
    error: unknown,
    fallbackTxId?: string,
  ): TransactionError | TransactionPrecheckError {
    const txId =
      error instanceof PrecheckStatusError ||
      error instanceof ReceiptStatusError
        ? error.transactionId?.toString()
        : (fallbackTxId ?? 'unknown');
    const detailedMessage = getCauseMessage(error);

    if (error instanceof PrecheckStatusError) {
      return new TransactionPrecheckError(txId, detailedMessage, {
        cause: error,
      });
    }

    const network = this.networkService.getCurrentNetwork();
    return new TransactionError('Transaction execution failed', false, {
      cause: error,
      context: { transactionId: txId, network, detailedMessage },
    });
  }

  async execute(transaction: HederaTransaction): Promise<TransactionResult> {
    this.logger.debug('[TX-EXECUTE] Executing transaction');
    const client = this.getClient();

    try {
      const response: TransactionResponse = await transaction.execute(client);
      return await this.processTransactionResponse(response, client);
    } catch (error) {
      throw this.wrapTransactionError(
        error,
        transaction.transactionId?.toString(),
      );
    } finally {
      client.close();
    }
  }

  async executeContractCreateFlow(
    flow: ContractCreateFlow,
  ): Promise<TransactionResult> {
    this.logger.debug('[TX-EXECUTE] Executing contract create flow');
    const client = this.getClient();

    try {
      const response: TransactionResponse = await flow.execute(client);
      return await this.processTransactionResponse(response, client);
    } catch (error) {
      throw this.wrapTransactionError(error);
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

    this.logger.debug(
      `[TX-EXECUTE] Transaction executed successfully: ${response.transactionId.toString()}`,
    );
    const consensusTimestamp = record.consensusTimestamp.toDate().toISOString();

    return mapReceiptToTransactionResult(
      response.transactionId.toString(),
      receipt,
      consensusTimestamp,
    );
  }
}
