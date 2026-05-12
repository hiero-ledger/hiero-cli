import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { ContractData } from '@/plugins/contract/schema';

import { AliasType } from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';

import { type ContractCleanupService } from './contract-cleanup.service.interface';
import { type ContractStateService } from './contract-state.service.interface';

export class ContractCleanupServiceImpl implements ContractCleanupService {
  constructor(
    private readonly contractState: ContractStateService,
    private readonly alias: AliasService,
    private readonly logger: Logger,
  ) {}

  removeContractFromLocalState(
    contract: ContractData,
    network: SupportedNetwork,
  ): string[] {
    const stateKey = composeKey(network, contract.contractId);

    const aliasesForContract = this.alias
      .list({ network, type: AliasType.Contract })
      .filter((rec) => rec.entityId === contract.contractId);

    const removedAliases: string[] = [];
    for (const rec of aliasesForContract) {
      this.alias.remove(rec.alias, network);
      removedAliases.push(`${rec.alias} (${network})`);
      this.logger.info(`Removed alias '${rec.alias}' on ${network}`);
    }

    this.contractState.deleteContract(stateKey);
    return removedAliases;
  }
}
