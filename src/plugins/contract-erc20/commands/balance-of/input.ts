import { z } from 'zod';

import {
  AccountReferenceObjectSchema,
  ContractReferenceObjectSchema,
} from '@/core/schemas';

/**
 * Input schema for contract erc20 call balanceOf command.
 * Parsed contract and account are discriminated objects: { type: EntityReferenceType, value: string }.
 * account accepts alias, account ID (0.0.xxx), or EVM address (0x...) via AccountReferenceObjectSchema.
 */
export const ContractErc20CallBalanceOfInputSchema = z.object({
  contract: ContractReferenceObjectSchema,
  account: AccountReferenceObjectSchema,
});
