import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas';
import { SupportedNetwork } from '@/core/types/shared.types';

export const ContractErc20CallTotalSupplyOutputSchema = z.object({
  contractId: EntityIdSchema,
  totalSupply: z
    .string()
    .describe('Total supply of tokens in base units (uint256)'),
  network: SupportedNetwork,
});

export type ContractErc20CallTotalSupplyOutput = z.infer<
  typeof ContractErc20CallTotalSupplyOutputSchema
>;

export const CONTRACT_ERC20_CALL_TOTAL_SUPPLY_CREATE_TEMPLATE = `
✅ Contract ({{hashscanLink contractId "contract" network}}) function "totalSupply" called successfully! 
   Total supply: {{totalSupply}}
`.trim();
