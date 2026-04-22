/**
 * Dissociate Token Command Output Schema and Template
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const TokenDissociateOutputSchema = z.object({
  transactionId: TransactionIdSchema.optional(),
  accountId: EntityIdSchema,
  tokenId: EntityIdSchema,
  dissociated: z.boolean().describe('Whether the dissociation was successful'),
  alreadyDissociated: z
    .boolean()
    .optional()
    .describe(
      'Token was not associated before this operation (either mirror pre-check or SDK status)',
    ),
  network: NetworkSchema,
});

export type TokenDissociateOutput = z.infer<typeof TokenDissociateOutputSchema>;

export const TOKEN_DISSOCIATE_TEMPLATE = `
{{#if alreadyDissociated}}
✅ Token is already not associated (nothing to do on chain)
{{else}}
✅ Token dissociation successful!
{{/if}}
   Token ID: {{hashscanLink tokenId "token" network}}
   Account ID: {{hashscanLink accountId "account" network}}
   Dissociated: {{dissociated}}
{{#if transactionId}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
{{/if}}
`.trim();
