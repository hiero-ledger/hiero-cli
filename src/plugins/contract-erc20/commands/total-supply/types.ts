import type { SupportedNetwork } from '@/core';

export interface ContractErc20TotalSupplyNormalizedParams {
  contractIdOrEvm: string;
  network: SupportedNetwork;
}
