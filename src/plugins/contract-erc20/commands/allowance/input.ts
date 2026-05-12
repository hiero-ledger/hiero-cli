import { z } from 'zod';

import {
  AccountReferenceObjectSchema,
  ContractReferenceObjectSchema,
} from '@/core/schemas';

/**
 * Input schema for contract erc20 call allowance command.
 * contract, owner and spender are discriminated objects: { type: EntityReferenceType, value: string }.
 * owner and spender accept alias, account ID (0.0.xxx), or EVM address (0x...) via AccountReferenceObjectSchema.
 */
export const ContractErc20CallAllowanceInputSchema = z.object({
  contract: ContractReferenceObjectSchema,
  owner: AccountReferenceObjectSchema,
  spender: AccountReferenceObjectSchema,
});
