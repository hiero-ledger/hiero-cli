/**
 * Associate Token Command Output Schema and Template
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

/**
 * Associate Token Command Output Schema
 */
export const AssociateTokenOutputSchema = z.object({
  transactionId: TransactionIdSchema.optional(),
  accountId: EntityIdSchema,
  tokenId: EntityIdSchema,
  associated: z.boolean().describe('Whether the association was successful'),
  alreadyAssociated: z
    .boolean()
    .optional()
    .describe('Indicates that the association already existed on chain'),
});

export type AssociateTokenOutput = z.infer<typeof AssociateTokenOutputSchema>;

/**
 * Human-readable template for associate token output
 */
export const ASSOCIATE_TOKEN_TEMPLATE = `
{{#if alreadyAssociated}}
✅ Token already associated!
{{else}}
✅ Token association successful!
{{/if}}
   Token ID: {{tokenId}}
   Account ID: {{accountId}}
   Associated: {{associated}}
{{#if transactionId}}
   Transaction ID: {{transactionId}}
{{/if}}
`.trim();
