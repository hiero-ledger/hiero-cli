import type { SupportedNetwork } from '@/core';

export interface ContractErc20AllowanceNormalizedParams {
  contractIdOrEvm: string;
  ownerEvmAddress: string;
  spenderEvmAddress: string;
  network: SupportedNetwork;
}
