import { z } from 'zod';

import {
  EntityIdSchema,
  EvmAddressSchema,
  NetworkSchema,
} from '@/core/schemas';

export const ContractErc721CallBalanceOfOutputSchema = z.object({
  contractId: EntityIdSchema,
  owner: EvmAddressSchema,
  balance: z
    .string()
    .regex(/^\d+$/, 'Balance must be a non-negative integer string'),
  network: NetworkSchema,
});

export type ContractErc721CallBalanceOfOutput = z.infer<
  typeof ContractErc721CallBalanceOfOutputSchema
>;

export const CONTRACT_ERC721_CALL_BALANCE_OF_CREATE_TEMPLATE = `
✅ Contract ({{hashscanLink contractId "contract" network}}) function "balanceOf" called successfully! 
   Owner: {{owner}}
   Balance: {{balance}}
`.trim();
