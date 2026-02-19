import type { SupportedNetwork } from '@/core/types/shared.types';

export const ALIAS_TYPE = {
  Account: 'account',
  Token: 'token',
  Key: 'key',
  Topic: 'topic',
  Contract: 'contract',
} as const;

export type AliasType = (typeof ALIAS_TYPE)[keyof typeof ALIAS_TYPE];

export interface AliasRecord {
  alias: string;
  type: AliasType;
  network: SupportedNetwork;
  entityId?: string;
  evmAddress?: string;
  publicKey?: string;
  keyRefId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AliasService {
  register(record: AliasRecord): void;
  resolve(
    ref: string,
    expectation: AliasType | undefined,
    network: SupportedNetwork,
  ): AliasRecord | null;
  resolveOrThrow(
    alias: string,
    type: AliasType,
    network: SupportedNetwork,
  ): AliasRecord;
  resolveByEvmAddress(
    evmAddress: string,
    network: SupportedNetwork,
  ): AliasRecord | null;
  list(filter?: {
    network?: SupportedNetwork;
    type?: AliasType;
  }): AliasRecord[];
  remove(alias: string, network: SupportedNetwork): void;
  clear(type: AliasType): void;
  exists(alias: string, network: SupportedNetwork): boolean;
  availableOrThrow(alias: string | undefined, network: SupportedNetwork): void;
}
