import type { CallMirrorNodeFunctionParams } from '@/core/services/contract-call/types';

export interface ContractCallService {
  callMirrorNodeFunction(
    params: CallMirrorNodeFunctionParams,
  ): Promise<unknown>;
}
