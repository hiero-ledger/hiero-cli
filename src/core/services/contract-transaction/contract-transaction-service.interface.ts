import type {
  ContractCreateFlowParams,
  ContractCreateFlowResult,
  ContractExecuteParams,
  ContractExecuteResult,
} from '@/core/services/contract-transaction/types';

export interface ContractTransactionService {
  /**
   * Create a contract create transaction (without execution)
   */
  contractCreateFlowTransaction(
    params: ContractCreateFlowParams,
  ): ContractCreateFlowResult;
  /**
   * Create a contract call transaction (without execution)
   */
  contractExecuteTransaction(
    params: ContractExecuteParams,
  ): ContractExecuteResult;
}
