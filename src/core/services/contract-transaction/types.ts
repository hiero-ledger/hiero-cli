import type {
  ContractCreateFlow,
  ContractDeleteTransaction,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  Key,
} from '@hashgraph/sdk';
import type { TinybarsInput } from '@/core/types/shared.types';

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

export interface ContractExecuteParams {
  contractId: string;
  gas: number;
  functionName: string;
  functionParameters?: ContractFunctionParameters;
  payableAmount?: TinybarsInput;
}

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
