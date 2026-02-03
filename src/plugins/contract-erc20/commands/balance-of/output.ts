import { z } from 'zod';

import { EntityIdSchema, EvmAddressSchema } from '@/core/schemas';
import { SupportedNetwork } from '@/core/types/shared.types';

export const ContractErc20CallBalanceOfOutputSchema = z.object({
  contractId: EntityIdSchema,
  account: EvmAddressSchema,
  balance: z
    .string()
    .regex(/^\d+$/, 'Balance must be a non-negative integer string'),
  network: SupportedNetwork,
});

export type ContractErc20CallBalanceOfOutput = z.infer<
  typeof ContractErc20CallBalanceOfOutputSchema
>;

export const CONTRACT_ERC20_CALL_BALANCE_OF_CREATE_TEMPLATE = `
✅ Contract ({{hashscanLink contractId "contract" network}}) function "balanceOf" called successfully! 
   Account: {{account}}
   Balance: {{balance}}
`.trim();
