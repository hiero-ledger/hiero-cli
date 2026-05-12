import type { HederaMirrornodeService, Logger } from '@/core';
import type { ContractQueryService } from '@/core/services/contract-query/contract-query-service.interface';
import type {
  QueryContractFunctionParams,
  QueryContractFunctionResult,
} from '@/core/services/contract-query/types';

import { NetworkError, NotFoundError, StateError } from '@/core/errors';

export class ContractQueryServiceImpl implements ContractQueryService {
  private mirrorService: HederaMirrornodeService;
  private logger: Logger;

  constructor(mirrorService: HederaMirrornodeService, logger: Logger) {
    this.mirrorService = mirrorService;
    this.logger = logger;
  }

  async queryContractFunction(
    params: QueryContractFunctionParams,
  ): Promise<QueryContractFunctionResult> {
    const contractInfo = await this.mirrorService.getContractInfo(
      params.contractIdOrEvmAddress,
    );
    if (!contractInfo) {
      throw new NotFoundError(
        `Contract ${params.contractIdOrEvmAddress} not found`,
      );
    }
    const contractId = contractInfo.contract_id;
    const contractEvmAddress = contractInfo.evm_address;
    if (!contractEvmAddress) {
      throw new StateError(
        `Contract ${contractId} does not have an EVM address`,
        {
          context: { contractId },
        },
      );
    }
    const data = params.abiInterface.encodeFunctionData(
      params.functionName,
      params.args,
    );
    this.logger.info(
      `Calling contract ${params.contractIdOrEvmAddress} "${params.functionName}" function on mirror node`,
    );
    const response = await this.mirrorService.postContractCall({
      to: contractEvmAddress,
      data: data,
    });

    if (!response || !response.result) {
      throw new NetworkError(
        `Contract call failed: ${contractId} "${params.functionName}"`,
        {
          context: { contractId, functionName: params.functionName },
          recoverable: true,
        },
      );
    }

    return {
      queryResult: params.abiInterface.decodeFunctionResult(
        params.functionName,
        response.result,
      ),
      contractId,
    };
  }
}
