import type {
  ContractCreateFlow,
  Transaction as HederaTransaction,
} from '@hiero-ledger/sdk';
import type { TransactionResult } from '@/core/types/shared.types';

export interface TxExecuteService {
  execute(transaction: HederaTransaction): Promise<TransactionResult>;
  executeContractCreateFlow(
    transaction: ContractCreateFlow,
  ): Promise<TransactionResult>;
}
