import type { SupportedNetwork } from '@/core';

export interface ContractErc20SymbolNormalizedParams {
  contractIdOrEvm: string;
  network: SupportedNetwork;
}
