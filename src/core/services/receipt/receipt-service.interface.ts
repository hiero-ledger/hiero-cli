import type { TransactionResult } from '@/core/types/shared.types';
import type { TransactionReceiptParams } from './types';

export interface ReceiptService {
  /**
   * Get transaction receipt by transaction ID using TransactionGetReceiptQuery.
   * @param params - Parameters containing the transaction ID
   * @returns Transaction result with receipt data
   */
  getReceipt(params: TransactionReceiptParams): Promise<TransactionResult>;
}
