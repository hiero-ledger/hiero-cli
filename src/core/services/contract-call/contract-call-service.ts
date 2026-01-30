import type { AliasService, HederaMirrornodeService, Logger } from '@/core';
import type { CallMirrorNodeFunctionParams } from '@/core/services/contract-call/types';
import type { SupportedNetwork } from '@/core/types/shared.types';

import { ContractId } from '@hashgraph/sdk';

import { EntityIdSchema } from '@/core/schemas';
import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { resolveAndInitAbiInterface } from '@/core/utils/contract-abi-resolver';

export class ContractCallServiceImpl {
  private aliasService: AliasService;
  private mirrorService: HederaMirrornodeService;
  private logger: Logger;

  constructor(
    aliasService: AliasService,
    mirrorService: HederaMirrornodeService,
    logger: Logger,
  ) {
    this.aliasService = aliasService;
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

  resolveContractId(
    contractIdOrAlias: string,
    currentNetwork: SupportedNetwork,
  ): string {
    const contractIdParseResult = EntityIdSchema.safeParse(contractIdOrAlias);

    if (contractIdParseResult.success) {
      return contractIdParseResult.data;
    }

    const contractAliasResult = this.aliasService.resolve(
      contractIdOrAlias,
      ALIAS_TYPE.Contract,
      currentNetwork,
    );

    if (!contractAliasResult) {
      throw new Error(
        `Contract alias "${contractIdOrAlias}" not found for network ${currentNetwork}. Please provide either a valid contract alias or contract ID.`,
      );
    }

    if (!contractAliasResult.entityId) {
      throw new Error(
        `Contract alias "${contractIdOrAlias}" does not have an associated contract ID.`,
      );
    }

    return contractAliasResult.entityId;
  }
}
