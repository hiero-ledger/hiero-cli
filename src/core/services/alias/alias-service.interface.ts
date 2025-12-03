import { SupportedNetwork } from '../../types/shared.types';

export const AliasType = {
  Account: 'account',
  Token: 'token',
  Key: 'key',
  Topic: 'topic',
  Contract: 'contract',
} as const;

export type AliasType = (typeof AliasType)[keyof typeof AliasType];

export interface AliasRecord {
  alias: string;
  type: AliasType;
  network: SupportedNetwork;
  entityId?: string;
  publicKey?: string;
  keyRefId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export interface AliasService {
  register(record: AliasRecord): void;
  resolve(
    ref: string,
    expectation: AliasType | undefined,
    network: SupportedNetwork,
  ): AliasRecord | null;
  list(filter?: {
    network?: SupportedNetwork;
    type?: AliasType;
  }): AliasRecord[];
  remove(alias: string, network: SupportedNetwork): void;
  exists(alias: string, network: SupportedNetwork): boolean;
  availableOrThrow(alias: string | undefined, network: SupportedNetwork): void;
}
