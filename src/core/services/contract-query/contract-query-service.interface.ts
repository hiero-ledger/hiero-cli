import type {
  QueryContractFunctionParams,
  QueryContractFunctionResult,
} from '@/core/services/contract-query/types';

export interface ContractQueryService {
  queryContractFunction(
    params: QueryContractFunctionParams,
  ): Promise<QueryContractFunctionResult>;
}
