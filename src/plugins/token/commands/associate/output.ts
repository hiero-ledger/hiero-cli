/**
 * Associate Fungible Token Command Output Schema and Template
 */
import { z } from 'zod';

import {
  EntityIdSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

/**
 * Associate Fungible Token Command Output Schema
 */
export const AssociateFungibleTokenOutputSchema = z.object({
  transactionId: TransactionIdSchema.optional(),
  accountId: EntityIdSchema,
  tokenId: EntityIdSchema,
  associated: z.boolean().describe('Whether the association was successful'),
  alreadyAssociated: z
    .boolean()
    .optional()
    .describe('Indicates that the association already existed on chain'),
});

export type AssociateFungibleTokenOutput = z.infer<
  typeof AssociateFungibleTokenOutputSchema
>;

/**
 * Human-readable template for associate fungible token output
 */
export const ASSOCIATE_FUNGIBLE_TOKEN_TEMPLATE = `
{{#if alreadyAssociated}}
✅ Fungible token already associated!
{{else}}
✅ Fungible token association successful!
{{/if}}
   Fungible Token ID: {{tokenId}}
   Account ID: {{accountId}}
   Associated: {{associated}}
{{#if transactionId}}
   Transaction ID: {{transactionId}}
{{/if}}
`.trim();
