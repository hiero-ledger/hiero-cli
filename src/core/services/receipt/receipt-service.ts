import type { TransactionReceipt } from '@hiero-ledger/sdk';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { NetworkService } from '@/core/services/network/network-service.interface';
import type { TransactionResult } from '@/core/types/shared.types';
import type { ReceiptService } from './receipt-service.interface';
import type { TransactionReceiptParams } from './types';

import { TransactionId, TransactionReceiptQuery } from '@hiero-ledger/sdk';

import { createClient } from '@/core/utils/client-init';
import { mapReceiptToTransactionResult } from '@/core/utils/receipt-mapper';

export class ReceiptServiceImpl implements ReceiptService {
  private logger: Logger;
  private networkService: NetworkService;

  constructor(logger: Logger, networkService: NetworkService) {
    this.logger = logger;
    this.networkService = networkService;
  }

  async getReceipt(
    params: TransactionReceiptParams,
  ): Promise<TransactionResult> {
    this.logger.debug(
      `[RECEIPT] Fetching receipt for transaction: ${params.transactionId}`,
    );

    const network = this.networkService.getCurrentNetwork();
    const client = createClient(
      network,
      this.networkService.getLocalnetConfig(),
    );

    try {
      const transactionId = TransactionId.fromString(params.transactionId);
      const receipt: TransactionReceipt = await new TransactionReceiptQuery()
        .setTransactionId(transactionId)
        .execute(client);
      return mapReceiptToTransactionResult(params.transactionId, receipt);
    } finally {
      client.close();
    }
  }
}
