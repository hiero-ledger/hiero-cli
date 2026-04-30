import type { AliasService, Logger, StateService } from '@/core';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { ContractData } from '@/plugins/contract/schema';

import { AliasType } from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';
import { ZustandContractStateHelper } from '@/plugins/contract/zustand-state-helper';

export class ContractHelper {
  private readonly contractState: ZustandContractStateHelper;
  private readonly logger: Logger;

  constructor(
    state: StateService,
    logger: Logger,
    private readonly alias: AliasService,
  ) {
    this.logger = logger;
    this.contractState = new ZustandContractStateHelper(state, logger);
  }

  removeContractFromLocalState(
    contractToDelete: ContractData,
    network: SupportedNetwork,
  ): string[] {
    const stateKey = composeKey(network, contractToDelete.contractId);

    const aliasesForContract = this.alias
      .list({ network, type: AliasType.Contract })
      .filter((rec) => rec.entityId === contractToDelete.contractId);

    const removedAliases: string[] = [];
    for (const rec of aliasesForContract) {
      this.alias.remove(rec.alias, network);
      removedAliases.push(`${rec.alias} (${network})`);
      this.logger.info(`🧹 Removed alias '${rec.alias}' on ${network}`);
    }

    this.contractState.deleteContract(stateKey);

    return removedAliases;
  }
}
