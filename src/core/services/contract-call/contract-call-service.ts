import type { HederaMirrornodeService, Logger } from '@/core';
import type { CallMirrorNodeFunctionParams } from '@/core/services/contract-call/types';

import { ContractId } from '@hashgraph/sdk';

import { resolveAndInitAbiInterface } from '@/core/utils/contract-abi-resolver';

export class ContractCallServiceImpl {
  private mirrorService: HederaMirrornodeService;
  private logger: Logger;

  constructor(mirrorService: HederaMirrornodeService, logger: Logger) {
    this.mirrorService = mirrorService;
    this.logger = logger;
  }

  async callMirrorNodeFunction(
    params: CallMirrorNodeFunctionParams,
  ): Promise<unknown> {
    const abiInterface = resolveAndInitAbiInterface(params.contractType);
    const data =
      params.args !== undefined && params.args.length > 0
        ? abiInterface.encodeFunctionData(params.functionName, params.args)
        : abiInterface.encodeFunctionData(params.functionName);

    this.logger.info(
      `Calling contract ${params.contractId} "${params.functionName}" function on mirror node`,
    );
    const response = await this.mirrorService.postContractCall({
      to: `0x${ContractId.fromString(params.contractId).toEvmAddress()}`,
      data: data,
    });

    if (!response || !response.result) {
      throw new Error(
        `There was a problem with calling contract ${params.contractId} "${params.functionName}" function`,
      );
    }
    const decodedParameter = abiInterface.decodeFunctionResult(
      params.functionName,
      response.result,
    );
    if (!decodedParameter || !decodedParameter[0]) {
      throw new Error(
        `There was a problem with decoding contract ${params.contractId} "${params.functionName}" function result`,
      );
    }
    return decodedParameter[0];
  }
}
