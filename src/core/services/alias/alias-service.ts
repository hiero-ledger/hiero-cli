import {
  AliasService,
  AliasRecord,
  AliasType,
} from './alias-service.interface';
import { SupportedNetwork } from '../../types/shared.types';
import { StateService } from '../state/state-service.interface';
import { Logger } from '../logger/logger-service.interface';

const NAMESPACE = 'aliases';

export class AliasServiceImpl implements AliasService {
  private readonly state: StateService;
  private readonly logger: Logger;

  constructor(state: StateService, logger: Logger) {
    this.state = state;
    this.logger = logger;
  }

  register(record: AliasRecord): void {
    if (this.exists(record.alias, record.network)) {
      throw new Error(
        `Alias already exists for network=${record.network}: ${record.alias}`,
      );
    }
    const key = this.composeKey(record.network, record.alias);
    const value: AliasRecord = {
      ...record,
      updatedAt: new Date().toISOString(),
    };
    this.state.set<AliasRecord>(NAMESPACE, key, value);
    this.logger.debug(
      `[ALIAS] Registered ${record.alias} (${record.type}) on ${record.network}`,
    );
  }

  resolve(
    ref: string,
    expectation: AliasType | undefined,
    network: SupportedNetwork,
  ): AliasRecord | null {
    const key = this.composeKey(network, ref);
    const rec = this.state.get<AliasRecord>(NAMESPACE, key);
    if (!rec) return null;
    if (expectation && rec.type !== expectation) return null;
    return rec;
  }

  list(filter?: {
    network?: SupportedNetwork;
    type?: AliasType;
  }): AliasRecord[] {
    const all = this.state.list<AliasRecord>(NAMESPACE) || [];
    return all.filter((r) => {
      if (!r) return false;
      if (filter?.network && r.network !== filter.network) return false;
      if (filter?.type && r.type !== filter.type) return false;
      return true;
    });
  }

  remove(alias: string, network: SupportedNetwork): void {
    const key = this.composeKey(network, alias);
    this.state.delete(NAMESPACE, key);
    this.logger.debug(`[ALIAS] Removed ${alias} on ${network}`);
  }

  clear(type: AliasType): void {
    const all = this.state.list<AliasRecord>(NAMESPACE) || [];
    all
      .filter((r) => {
        if (!r) return false;
        return r.type === type;
      })
      .forEach((r) => {
        this.state.delete(NAMESPACE, this.composeKey(r.network, r.alias));
        this.logger.debug(`[ALIAS] Removed ${r.alias} on ${r.network}`);
      });
    this.logger.debug(`[ALIAS] Cleared aliases for type ${type}`);
  }

  exists(alias: string, network: SupportedNetwork): boolean {
    const key = this.composeKey(network, alias);
    return this.state.has(NAMESPACE, key);
  }

  availableOrThrow(alias: string | undefined, network: SupportedNetwork): void {
    if (!alias) return;

    const exists = this.exists(alias, network);
    if (exists) {
      throw new Error(
        `Alias "${alias}" already exists on network "${network}"`,
      );
    }
  }

  private composeKey(network: SupportedNetwork, alias: string): string {
    return `${network}:${alias}`;
  }
}
