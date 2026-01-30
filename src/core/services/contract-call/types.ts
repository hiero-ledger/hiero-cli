import type { ContractType } from '@/core/types/shared.types';

export interface CallMirrorNodeFunctionParams {
  contractType: ContractType;
  functionName: string;
  contractId: string;
  args?: unknown[];
}
