import type { SupportedNetwork } from '@/core';

export interface ContractErc20DecimalsNormalizedParams {
  contractIdOrEvm: string;
  network: SupportedNetwork;
}
