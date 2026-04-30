import type {
  ContractCreateFlowParams,
  ContractCreateFlowResult,
  ContractDeleteResult,
  ContractExecuteEncodedParams,
  ContractExecuteParams,
  ContractExecuteResult,
  DeleteContractParams,
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
  /**
   * Create a contract call transaction with encoded params in Uint8Array
   */
  contractExecuteWithEncodedParams(
    params: ContractExecuteEncodedParams,
  ): ContractExecuteResult;
  /**
   * Build a ContractDeleteTransaction (sign with contract admin key + operator)
   */
  deleteContract(params: DeleteContractParams): ContractDeleteResult;
}
