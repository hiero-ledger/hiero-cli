import type { SupportedNetwork } from '@/core';

export interface ContractErc20NameNormalizedParams {
  contractIdOrEvm: string;
  network: SupportedNetwork;
}
