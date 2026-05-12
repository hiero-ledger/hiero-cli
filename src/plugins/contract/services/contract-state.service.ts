import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { StateService } from '@/core/services/state/state-service.interface';

import { CONTRACT_NAMESPACE } from '@/plugins/contract/constants';
import { type ContractData } from '@/plugins/contract/schema';

import { type ContractStateService } from './contract-state.service.interface';

export class ContractStateServiceImpl implements ContractStateService {
  constructor(
    private readonly state: StateService,
    private readonly logger: Logger,
  ) {}

  hasContract(key: string): boolean {
    return this.state.has(CONTRACT_NAMESPACE, key);
  }

  getContract(key: string): ContractData | undefined {
    return this.state.get<ContractData>(CONTRACT_NAMESPACE, key);
  }

  saveContract(key: string, data: ContractData): void {
    this.state.set(CONTRACT_NAMESPACE, key, data);
  }

  deleteContract(key: string): void {
    this.logger.debug(`[CONTRACT STATE] Deleting contract ${key}`);
    this.state.delete(CONTRACT_NAMESPACE, key);
  }

  listContracts(): ContractData[] {
    const all = this.state.list<ContractData>(CONTRACT_NAMESPACE);
    return all.filter((c) => c?.contractId != null);
  }
}
