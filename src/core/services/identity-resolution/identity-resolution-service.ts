import type { AliasService, HederaMirrornodeService } from '@/core';
import type { IdentityResolutionService } from '@/core/services/identity-resolution/identity-resolution-service.interface';
import type {
  AccountResolutionParams,
  AccountResolutionResult,
  ContractResolutionParams,
  ContractResolutionResult,
  ReferenceResolutionParams,
  ReferenceResolutionResult,
} from '@/core/services/identity-resolution/types';

import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { EntityReferenceType } from '@/core/types/shared.types';

export class IdentityResolutionServiceImpl implements IdentityResolutionService {
  private readonly aliasService: AliasService;
  private readonly mirrorService: HederaMirrornodeService;

  constructor(
    aliasService: AliasService,
    mirrorService: HederaMirrornodeService,
  ) {
    this.aliasService = aliasService;
    this.mirrorService = mirrorService;
  }

  async resolveAccount(
    params: AccountResolutionParams,
  ): Promise<AccountResolutionResult> {
    const accountReferenceResolutionResult =
      this.resolveReferenceToEntityOrEvmAddress({
        entityReference: params.accountReference,
        referenceType: params.type,
        network: params.network,
        aliasType: ALIAS_TYPE.Account,
      });
    const accountInfo = await this.mirrorService.getAccount(
      accountReferenceResolutionResult.entityIdOrEvmAddress,
    );
    return {
      accountId: accountInfo.accountId,
      accountPublicKey: accountInfo.accountPublicKey,
      evmAddress: accountInfo.evmAddress,
    };
  }

  async resolveContract(
    params: ContractResolutionParams,
  ): Promise<ContractResolutionResult> {
    const contractReferenceResolutionResult =
      this.resolveReferenceToEntityOrEvmAddress({
        entityReference: params.contractReference,
        referenceType: params.type,
        network: params.network,
        aliasType: ALIAS_TYPE.Contract,
      });
    const contractInfo = await this.mirrorService.getContractInfo(
      contractReferenceResolutionResult.entityIdOrEvmAddress,
    );
    return {
      contractId: contractInfo.contract_id,
      evmAddress: contractInfo.evm_address,
    };
  }

  resolveReferenceToEntityOrEvmAddress(
    params: ReferenceResolutionParams,
  ): ReferenceResolutionResult {
    const entityIdOrEvmAddress =
      params.referenceType === EntityReferenceType.ALIAS
        ? this.aliasService.resolveOrThrow(
            params.entityReference,
            params.aliasType,
            params.network,
          ).entityId
        : params.entityReference;
    if (!entityIdOrEvmAddress) {
      throw new Error(
        `Entity ${params.entityReference} with type ${params.aliasType} is missing an entity ID in its alias record`,
      );
    }
    return { entityIdOrEvmAddress };
  }
}
