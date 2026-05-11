import type { ContractCreateFlow } from '@hiero-ledger/sdk';
import type { BaseExecuteTransactionResult } from '@/core';
import type { CompilationResult } from '@/core/services/contract-compiler/types';
import type { ContractCreateFlowResult } from '@/core/services/contract-transaction/types';
import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';
import type { SupportedNetwork } from '@/core/types/shared.types';

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
  adminKeys: ResolvedPublicKey[];
  adminKeyThreshold: number;
  network: SupportedNetwork;
  initialBalanceRaw?: bigint;
  autoRenewPeriod?: number;
  autoRenewAccountId?: string;
  maxAutomaticTokenAssociations?: number;
  stakedAccountId?: string;
  stakedNodeId?: number;
  declineStakingReward?: boolean;
}

export interface ContractCreateBuildTransactionResult {
  compilationResult: CompilationResult;
  contractCreateFlowTx: ContractCreateFlowResult;
}

export interface ContractCreateSignTransactionResult {
  signedFlow: ContractCreateFlow;
}

export interface ContractCreateExecuteTransactionResult extends BaseExecuteTransactionResult {}
