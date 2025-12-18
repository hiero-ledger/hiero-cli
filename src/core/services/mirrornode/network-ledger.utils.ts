import type { SupportedNetwork } from '@/core/types/shared.types';

import { LedgerId } from '@hashgraph/sdk';

export function mapNetworkToLedgerId(network: SupportedNetwork): LedgerId {
  switch (network) {
    case 'mainnet':
      return LedgerId.MAINNET;
    case 'testnet':
      return LedgerId.TESTNET;
    case 'previewnet':
      return LedgerId.PREVIEWNET;
    case 'localnet':
      return LedgerId.LOCAL_NODE;
    default:
      return LedgerId.TESTNET;
  }
}
