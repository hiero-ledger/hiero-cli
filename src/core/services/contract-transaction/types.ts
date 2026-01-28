import type { ContractCreateFlow, Key } from '@hashgraph/sdk';

export interface ContractCreateFlowParams {
  bytecode: string;
  gas: number;
  abiDefinition: string;
  constructorParameters: string[];
  adminKey?: Key;
  memo?: string;
}

export interface ContractCreateFlowResult {
  transaction: ContractCreateFlow;
}
