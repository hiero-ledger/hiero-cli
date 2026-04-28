import type { TransferTransaction } from '@hashgraph/sdk';
import type {
  CreateFtTransferParams,
  CreateHbarTransferParams,
  SwapTransferParams,
} from './types';

export interface TransferService {
  createHbarTransferTransaction(
    params: CreateHbarTransferParams,
  ): TransferTransaction;

  createFtTransferTransaction(
    params: CreateFtTransferParams,
  ): TransferTransaction;

  createAtomicSwapTransaction(
    transfers: SwapTransferParams[],
  ): TransferTransaction;
}
