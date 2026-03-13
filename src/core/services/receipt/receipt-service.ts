import type { Client, TransactionReceipt } from '@hashgraph/sdk';
import type { KmsService } from '@/core/services/kms/kms-service.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { NetworkService } from '@/core/services/network/network-service.interface';
import type { TransactionResult } from '@/core/types/shared.types';
import type { ReceiptService } from './receipt-service.interface';
import type { TransactionReceiptParams } from './types';

import { Status, TransactionId, TransactionReceiptQuery } from '@hashgraph/sdk';

export class ReceiptServiceImpl implements ReceiptService {
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

  async getReceipt(
    params: TransactionReceiptParams,
  ): Promise<TransactionResult> {
    this.logger.debug(
      `[RECEIPT] Fetching receipt for transaction: ${params.transactionId}`,
    );

    const client = this.getClient();

    try {
      const transactionId = TransactionId.fromString(params.transactionId);
      const receipt: TransactionReceipt = await new TransactionReceiptQuery()
        .setTransactionId(transactionId)
        .execute(client);

      return this.mapReceiptToTransactionResult(params.transactionId, receipt);
    } finally {
      client.close();
    }
  }

  private mapReceiptToTransactionResult(
    transactionId: string,
    receipt: TransactionReceipt,
  ): TransactionResult {
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

    const success = receipt.status === Status.Success;

    return {
      transactionId,
      success,
      consensusTimestamp: '',
      accountId,
      tokenId,
      topicId,
      contractId,
      topicSequenceNumber,
      receipt: {
        status: {
          status: success ? 'success' : 'failed',
          transactionId,
        },
        serials,
      },
    };
  }
}
