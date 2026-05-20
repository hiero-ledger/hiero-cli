import type { BatchData } from '@/plugins/batch/schema';

import { SupportedNetwork } from '@/core/types/shared.types';

export const BATCH_NAME = 'my-batch';
export const BATCH_KEY_REF_ID = 'kr_batch_test123';
export const BATCH_NETWORK = SupportedNetwork.TESTNET;
export const BATCH_COMPOSED_KEY = `${BATCH_NETWORK}:${BATCH_NAME}`;

export const OPERATOR_KEY_REF_ID = 'operator-key-ref-id';

export const mockBatchData: BatchData = {
  name: BATCH_NAME,
  keyRefId: BATCH_KEY_REF_ID,
  executed: false,
  success: false,
  transactions: [],
};

export const mockBatchDataWithTransactions: BatchData = {
  name: BATCH_NAME,
  keyRefId: BATCH_KEY_REF_ID,
  executed: false,
  success: false,
  transactions: [
    {
      transactionBytes: 'abcdef123456789001',
      order: 1,
      command: 'account_create',
      normalizedParams: {},
      keyRefIds: [],
    },
    {
      transactionBytes: 'abcdef123456789002',
      order: 2,
      command: 'token_create-ft',
      normalizedParams: {},
      keyRefIds: [],
    },
  ],
};

export const mockBatchDataWithAliasedTransaction: BatchData = {
  name: BATCH_NAME,
  keyRefId: BATCH_KEY_REF_ID,
  executed: false,
  success: false,
  transactions: [
    {
      transactionBytes: 'abcdef123456789001',
      order: 1,
      command: 'account_create',
      normalizedParams: { alias: 'my-account' },
      keyRefIds: [],
    },
  ],
};

export const mockExecutedBatchData: BatchData = {
  name: BATCH_NAME,
  keyRefId: BATCH_KEY_REF_ID,
  executed: true,
  success: true,
  transactions: [],
};
