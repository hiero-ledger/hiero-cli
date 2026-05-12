import { z } from 'zod';

import {
  EntityIdSchema,
  EvmAddressSchema,
  NetworkSchema,
} from '@/core/schemas';

export const ContractErc20CallAllowanceOutputSchema = z.object({
  contractId: EntityIdSchema,
  owner: EvmAddressSchema,
  spender: EvmAddressSchema,
  allowance: z
    .string()
    .regex(/^\d+$/, 'Allowance must be a non-negative integer string'),
  network: NetworkSchema,
});

export type ContractErc20CallAllowanceOutput = z.infer<
  typeof ContractErc20CallAllowanceOutputSchema
>;

export const CONTRACT_ERC20_CALL_ALLOWANCE_CREATE_TEMPLATE = `
✅ Contract ({{hashscanLink contractId "contract" network}}) function "allowance" called successfully! 
   Owner: {{owner}}
   Spender: {{spender}}
   Allowance: {{allowance}}
`.trim();
