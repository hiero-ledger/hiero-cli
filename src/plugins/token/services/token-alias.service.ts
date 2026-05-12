import type {
  AliasRecord,
  AliasService,
} from '@/core/services/alias/alias-service.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type {
  TokenAliasRegistration,
  TokenAliasService,
} from '@/plugins/token/services/token-alias.service.interface';

import { AliasType } from '@/core/types/shared.types';

export class TokenAliasServiceImpl implements TokenAliasService {
  constructor(private readonly alias: AliasService) {}

  availableOrThrow(alias: string | undefined, network: SupportedNetwork): void {
    this.alias.availableOrThrow(alias, network);
  }

  exists(alias: string, network: SupportedNetwork): boolean {
    return this.alias.exists(alias, network);
  }

  register(registration: TokenAliasRegistration): void {
    this.alias.register({
      alias: registration.alias,
      type: AliasType.Token,
      network: registration.network,
      entityId: registration.tokenId,
      createdAt: registration.createdAt ?? new Date().toISOString(),
    });
  }

  list(network: SupportedNetwork): AliasRecord[] {
    return this.alias.list({ network, type: AliasType.Token });
  }

  remove(alias: string, network: SupportedNetwork): void {
    this.alias.remove(alias, network);
  }

  resolveAliasForToken(
    tokenId: string,
    network: SupportedNetwork,
  ): string | undefined {
    return this.alias.resolve(tokenId, AliasType.Token, network)?.alias;
  }
}
