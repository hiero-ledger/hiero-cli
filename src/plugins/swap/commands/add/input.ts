import { z } from 'zod';

import {
  AliasNameSchema,
  AmountInputSchema,
  KeyManagerTypeSchema,
  KeySchema,
} from '@/core/schemas';
import { EntityIdSchema } from '@/core/schemas/common-schemas';
import { SwapTransferType } from '@/core/services/transfer/types';

export const SwapAddInputSchema = z.object({
  swap: AliasNameSchema.describe('Name of the swap to add the transfer to'),
  from: KeySchema.describe(
    'Sender account. Accepts account ID, alias, or key reference.',
  ),
  to: KeySchema.describe(
    'Receiver account. Accepts account ID, alias, or key reference. Must have a key in KMS (both parties sign).',
  ),
  type: z.nativeEnum(SwapTransferType).describe('Transfer type: hbar or ft'),
  amount: AmountInputSchema.describe(
    'Amount to transfer. Format: "100" (display units) or "100t" (base units)',
  ),
  tokenId: EntityIdSchema.optional().describe(
    'Token ID — required when --type ft',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type SwapAddInput = z.infer<typeof SwapAddInputSchema>;
