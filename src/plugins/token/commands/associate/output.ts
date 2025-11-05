/**
 * Associate Token Command Output Schema and Template
 */
import { z } from 'zod';
import {
  EntityIdSchema,
  TransactionIdSchema,
} from '../../../../core/schemas/common-schemas';

/**
 * Associate Token Command Output Schema
 */
export const AssociateTokenOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  accountId: EntityIdSchema,
  tokenId: EntityIdSchema,
  associated: z.boolean().describe('Whether the association was successful'),
});

export type AssociateTokenOutput = z.infer<typeof AssociateTokenOutputSchema>;

/**
 * Human-readable template for associate token output
 */
export const ASSOCIATE_TOKEN_TEMPLATE = `
✅ Token association successful!
   Token ID: {{tokenId}}
   Account ID: {{accountId}}
   Associated: {{associated}}
   Transaction ID: {{transactionId}}
`.trim();
