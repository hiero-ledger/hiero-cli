import { z } from 'zod';

import {
  AccountReferenceObjectSchema,
  ContractErc721TokenIdSchema,
  ContractReferenceObjectSchema,
  GasInputSchema,
  HexEncodedDataSchema,
} from '@/core/schemas';

/**
 * Input schema for contract erc721 execute safeTransferFrom command.
 * Parsed contract/from/to are discriminated objects: { type: EntityReferenceType, value: string }.
 */
export const ContractErc721CallSafeTransferFromInputSchema = z.object({
  contract: ContractReferenceObjectSchema,
  gas: GasInputSchema.optional()
    .default(100000)
    .describe('Gas for contract call. Default: 100000'),
  from: AccountReferenceObjectSchema,
  to: AccountReferenceObjectSchema,
  tokenId: ContractErc721TokenIdSchema.describe(
    'Token ID for contract safeTransferFrom call',
  ),
  data: HexEncodedDataSchema.optional().describe(
    'Optional arbitrary data for safeTransferFrom call',
  ),
});
