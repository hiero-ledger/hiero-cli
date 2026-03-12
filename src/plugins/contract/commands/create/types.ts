import type { ContractCreateFlow } from '@hashgraph/sdk';
import type { CompilationResult } from '@/core/services/contract-compiler/types';
import type { ContractCreateFlowResult } from '@/core/services/contract-transaction/types';
import type {
  SupportedNetwork,
  TransactionResult,
} from '@/core/types/shared.types';

export interface ContractCreateNormalisedParams {
  alias: string;
  defaultTemplate?: string;
  gas: number;
  basePath: string;
  memo?: string;
  solidityVersion?: string;
  constructorParameters: string[];
  keyManager?: string;
  filename: string;
  contractName: string;
  contractFileContent: string;
  contractBasename: string;
  admin?: { keyRefId: string; publicKey: string };
  network: SupportedNetwork;
}

export interface ContractCreateBuildTransactionResult {
  compilationResult: CompilationResult;
  contractCreateFlowTx: ContractCreateFlowResult;
}

export interface ContractCreateSignTransactionResult {
  signedFlow: ContractCreateFlow;
}

export type ContractCreateExecuteTransactionResult = TransactionResult;
