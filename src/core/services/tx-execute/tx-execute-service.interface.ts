import type { ContractCreateFlow } from '@hashgraph/sdk';
import type { TransactionResult } from '@/core/types/shared.types';

export interface TxExecuteService {
  executeBytes(bytes: Uint8Array): Promise<TransactionResult>;
  executeContractCreateFlow(
    transaction: ContractCreateFlow,
  ): Promise<TransactionResult>;
}
