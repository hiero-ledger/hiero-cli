import type { Transaction } from '@hashgraph/sdk';
import type { SupportedNetwork } from '@/core';
import type { BatchData } from '@/plugins/batch/schema';

export interface BatchNormalisedParams {
  name: string;
  network: SupportedNetwork;
  batchData: BatchData;
}

export interface BatchBuildAndSignResult {
  transaction: Transaction;
}
