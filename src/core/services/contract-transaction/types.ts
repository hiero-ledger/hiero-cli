import type {
  ContractCreateFlow,
  ContractDeleteTransaction,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  Key,
} from '@hiero-ledger/sdk';

export interface ContractCreateFlowParams {
  bytecode: string;
  gas: number;
  abiDefinition: string;
  constructorParameters: string[];
  adminKey?: Key;
  memo?: string;
  initialBalanceRaw?: bigint;
  autoRenewPeriod?: number;
  autoRenewAccountId?: string;
  maxAutomaticTokenAssociations?: number;
  stakedAccountId?: string;
  stakedNodeId?: number;
  declineStakingReward?: boolean;
}

export interface ContractCreateFlowResult {
  transaction: ContractCreateFlow;
}

export interface ContractExecuteBaseParams {
  contractId: string;
  gas: number;
  payableAmountTinybars?: string;
}

export type ContractExecuteParams = ContractExecuteBaseParams & {
  functionName: string;
  functionParameters?: ContractFunctionParameters;
};

export type ContractExecuteEncodedParams = ContractExecuteBaseParams & {
  functionParametersEncoded: Uint8Array;
};

export interface ContractExecuteResult {
  transaction: ContractExecuteTransaction;
}

export interface DeleteContractParams {
  contractId: string;
  transferAccountId?: string;
  transferContractId?: string;
}

export interface ContractDeleteResult {
  transaction: ContractDeleteTransaction;
}
