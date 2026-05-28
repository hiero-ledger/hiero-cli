import type { SupportedNetwork } from '@/core/types/shared.types';
import type { TokenPendingAirdropsResult } from '@/plugins/token/services/token-pending-airdrops.types';

export interface TokenPendingAirdropsService {
  getPendingAirdrops(
    account: string,
    showAll: boolean,
    network: SupportedNetwork,
  ): Promise<TokenPendingAirdropsResult>;
}
