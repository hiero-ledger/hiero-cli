import { z } from 'zod';

import {
  AccountReferenceSchema,
  EntityReferenceSchema,
  KeyManagerTypeSchema,
  KeySchema,
} from '@/core/schemas';

export const TokenCancelAirdropInputSchema = z.object({
  token: EntityReferenceSchema.describe('Token identifier (ID or alias)'),
  receiver: AccountReferenceSchema.describe(
    'Receiver account (ID, EVM address, or alias)',
  ),
  serial: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('NFT serial number. If provided, cancels an NFT airdrop.'),
  from: KeySchema.optional().describe(
    'Sender key. Accepts any key format. Defaults to operator.',
  ),
  keyManager: KeyManagerTypeSchema.optional().describe(
    'Key manager type (defaults to config setting)',
  ),
});

export type TokenCancelAirdropInput = z.infer<
  typeof TokenCancelAirdropInputSchema
>;
