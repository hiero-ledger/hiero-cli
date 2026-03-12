import type { SupportedNetwork } from '@/core';

export interface ContractErc20BalanceOfNormalizedParams {
  contractIdOrEvm: string;
  accountEvmAddress: string;
  network: SupportedNetwork;
}
