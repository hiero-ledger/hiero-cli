import type { AliasRecord } from '@/core/services/alias/alias-service.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';

export interface TokenAliasRegistration {
  alias: string;
  tokenId: string;
  network: SupportedNetwork;
  createdAt?: string;
}

export interface TokenAliasService {
  availableOrThrow(alias: string | undefined, network: SupportedNetwork): void;
  exists(alias: string, network: SupportedNetwork): boolean;
  register(registration: TokenAliasRegistration): void;
  list(network: SupportedNetwork): AliasRecord[];
  remove(alias: string, network: SupportedNetwork): void;
  resolveAliasForToken(
    tokenId: string,
    network: SupportedNetwork,
  ): string | undefined;
}
