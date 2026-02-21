import type { HederaMirrornodeService, Logger } from '@/core';
import type { ContractQueryService } from '@/core/services/contract-query/contract-query-service.interface';
import type {
  QueryContractFunctionParams,
  QueryContractFunctionResult,
} from '@/core/services/contract-query/types';

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
      throw new Error(`Contract ${params.contractIdOrEvmAddress} not found`);
    }
    const contractId = contractInfo.contract_id;
    const contractEvmAddress = contractInfo.evm_address;
    if (!contractEvmAddress) {
      throw new Error(`Contract ${contractId} does not have an EVM address`);
    }
    const data = params.abiInterface.encodeFunctionData(
      params.functionName,
      params.args,
    );
    this.logger.info(
      `Calling contract ${params.contractIdOrEvmAddress} "${params.functionName}" function on mirror node`,
    );
    // Normalize to lowercase hex; some mirror node validators require it
    const toHex = (contractEvmAddress.startsWith('0x') ? contractEvmAddress : `0x${contractEvmAddress}`).toLowerCase();
    const dataHex = (data.startsWith('0x') ? data : `0x${data}`).toLowerCase();
    // Mirror node may require "from"; use zero address for read-only queries (same as Hedera SDK behavior when sender is unset)
    const fromHex = '0x0000000000000000000000000000000000000000';
    const response = await this.mirrorService.postContractCall({
      from: fromHex,
      to: toHex,
      data: dataHex,
    });

    if (!response || !response.result) {
      throw new Error(
        `There was a problem with calling contract ${contractId} "${params.functionName}" function`,
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
