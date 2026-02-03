import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas';
import { SupportedNetwork } from '@/core/types/shared.types';

export const ContractErc20CallTotalSupplyOutputSchema = z.object({
  contractId: EntityIdSchema,
  totalSupply: z
    .string()
    .regex(/^\d+$/, 'Total supply must be a non-negative integer string'),
  network: SupportedNetwork,
});

export type ContractErc20CallTotalSupplyOutput = z.infer<
  typeof ContractErc20CallTotalSupplyOutputSchema
>;

export const CONTRACT_ERC20_CALL_TOTAL_SUPPLY_CREATE_TEMPLATE = `
✅ Contract ({{hashscanLink contractId "contract" network}}) function "totalSupply" called successfully! 
   Total supply: {{totalSupply}}
`.trim();
