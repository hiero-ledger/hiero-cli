import type { BatchTransactionService } from '@/core/services/batch/batch-transaction-service.interface';
import type {
  CreateBatchTransactionParams,
  CreateBatchTransactionResult,
} from '@/core/services/batch/types';
import type { Logger } from '@/core/services/logger/logger-service.interface';

import { BatchTransaction } from '@hiero-ledger/sdk';

export class BatchTransactionServiceImpl implements BatchTransactionService {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  createBatchTransaction(
    params: CreateBatchTransactionParams,
  ): CreateBatchTransactionResult {
    this.logger.debug(
      `[BATCH TX] Creating batch transaction with ${params.transactions.length} inner transactions`,
    );
    const batchTransaction = new BatchTransaction();
    params.transactions.forEach((tx) => {
      batchTransaction.addInnerTransaction(tx);
    });
    return {
      transaction: batchTransaction,
    };
  }
}
