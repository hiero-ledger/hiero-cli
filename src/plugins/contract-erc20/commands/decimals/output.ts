import { z } from 'zod';

import { EntityIdSchema, EvmDecimalsSchema } from '@/core/schemas';
import { SupportedNetwork } from '@/core/types/shared.types';

export const ContractErc20CallDecimalsOutputSchema = z.object({
  contractId: EntityIdSchema,
  decimals: EvmDecimalsSchema,
  network: SupportedNetwork,
});

export type ContractErc20CallDecimalsOutput = z.infer<
  typeof ContractErc20CallDecimalsOutputSchema
>;

export const CONTRACT_ERC20_CALL_DECIMALS_TEMPLATE = `
✅ Contract ({{hashscanLink contractId "contract" network}}) function "decimals" called successfully! 
   Decimals: {{decimals}}
`.trim();
