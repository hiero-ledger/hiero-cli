import type { SupportedNetwork } from '@/core/types/shared.types';

export interface ResolvedDestinationAccount {
  accountId: string;
}

export interface ResolvedToken {
  tokenId: string;
}

export interface TokenReferenceService {
  resolveDestinationAccount(
    account: string | undefined,
    network: SupportedNetwork,
  ): Promise<ResolvedDestinationAccount | null>;
  resolveToken(
    token: string | undefined,
    network: SupportedNetwork,
  ): ResolvedToken | null;
}
