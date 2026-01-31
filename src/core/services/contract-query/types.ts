import type { Interface, Result } from 'ethers';

export interface QueryContractFunctionParams {
  abiInterface: Interface;
  functionName: string;
  contractIdOrEvmAddress: string;
  args?: unknown[];
}

export interface QueryContractFunctionResult {
  contractId: string;
  queryResult: Result;
}
