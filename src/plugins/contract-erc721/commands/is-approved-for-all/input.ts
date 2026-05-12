import { z } from 'zod';

import {
  AccountReferenceObjectSchema,
  ContractReferenceObjectSchema,
} from '@/core/schemas';

/**
 * Input schema for contract erc721 call isApprovedForAll command.
 * Parsed contract/owner/operator are discriminated objects: { type: EntityReferenceType, value: string }.
 */
export const ContractErc721CallIsApprovedForAllInputSchema = z.object({
  contract: ContractReferenceObjectSchema,
  owner: AccountReferenceObjectSchema,
  operator: AccountReferenceObjectSchema,
});
