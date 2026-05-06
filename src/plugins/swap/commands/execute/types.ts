import type { SupportedNetwork, TransactionResult } from '@/core';
import type {
  FtTransferEntry,
  HbarTransferEntry,
  NftTransferEntry,
} from '@/core/services/transfer';
import type {
  BaseBuildTransactionResult,
  BaseSignTransactionResult,
} from '@/core/types/transaction.types';
import type { SwapEntry } from '@/plugins/swap/schema';

export interface SwapExecuteNormalisedParams {
  name: string;
  network: SupportedNetwork;
  swap: SwapEntry;
  entries: (HbarTransferEntry | FtTransferEntry | NftTransferEntry)[];
  keyRefIds: string[];
}

export interface SwapExecuteBuildTransactionResult extends BaseBuildTransactionResult {}

export interface SwapExecuteSignTransactionResult extends BaseSignTransactionResult {}

export type SwapExecuteExecuteTransactionResult = TransactionResult;
