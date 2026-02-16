import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { StateService } from '@/core/services/state/state-service.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type {
  AliasRecord,
  AliasService,
  AliasType,
} from './alias-service.interface';

import { NotFoundError, ValidationError } from '@/core/errors';

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
      throw new ValidationError(
        `Alias already exists for network=${record.network}: ${record.alias}`,
        { context: { alias: record.alias, network: record.network } },
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

  resolveOrThrow(
    alias: string,
    type: AliasType,
    network: SupportedNetwork,
  ): AliasRecord {
    const rec = this.resolve(alias, type, network);
    if (!rec) {
      throw new NotFoundError(
        `Alias "${alias}" for ${type} on network "${network}" not found`,
        { context: { alias, type, network } },
      );
    }
    return rec;
  }

  resolveByEvmAddress(
    evmAddress: string,
    network: SupportedNetwork,
  ): AliasRecord | null {
    const all = this.state.list<AliasRecord>(NAMESPACE) || [];
    const normalizedAddress = evmAddress.toLowerCase();

    return (
      all.find(
        (aliasRecord) =>
          aliasRecord &&
          aliasRecord.network === network &&
          aliasRecord.evmAddress?.toLowerCase() === normalizedAddress,
      ) ?? null
    );
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
      throw new ValidationError(
        `Alias "${alias}" already exists on network "${network}"`,
        { context: { alias, network } },
      );
    }
  }

  private composeKey(network: SupportedNetwork, alias: string): string {
    return `${network}:${alias}`;
  }
}
