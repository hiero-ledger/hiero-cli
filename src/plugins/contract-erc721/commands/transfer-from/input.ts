import { z } from 'zod';

import {
  AccountReferenceObjectSchema,
  ContractErc721TokenIdSchema,
  ContractReferenceObjectSchema,
  GasInputSchema,
} from '@/core/schemas';

/**
 * Input schema for contract erc721 call transferFrom command.
 * Parsed contract is a discriminated object: { type: EntityReferenceType, value: string }.
 */
export const ContractErc721CallTransferFromInputSchema = z.object({
  contract: ContractReferenceObjectSchema,
  gas: GasInputSchema.describe('Gas for contract call. Default: 100000'),
  from: AccountReferenceObjectSchema,
  to: AccountReferenceObjectSchema,
  tokenId: ContractErc721TokenIdSchema.describe(
    'Token ID (uint256) for transferFrom function call',
  ),
});
