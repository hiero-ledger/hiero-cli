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
import type { TransactionResult } from '@/core/types/shared.types';
import type { TxExecuteService } from './tx-execute-service.interface';

import { TransactionError } from '@/core/errors';
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

  async execute(transaction: HederaTransaction): Promise<TransactionResult> {
    this.logger.debug('[TX-EXECUTE] Executing transaction');
    const client = this.getClient();

    try {
      const response: TransactionResponse = await transaction.execute(client);
      return await this.processTransactionResponse(response, client);
    } catch (error) {
      throw new TransactionError(
        `Transaction execution failed (txId: ${transaction.transactionId?.toString() ?? 'unknown'})`,
        false,
        { cause: error },
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
      throw new TransactionError(
        'Contract create flow execution failed',
        false,
        { cause: error },
      );
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
