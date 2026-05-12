import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const TokenDeleteAllowanceNftOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  tokenId: EntityIdSchema,
  ownerAccountId: EntityIdSchema,
  spenderAccountId: EntityIdSchema.nullable().describe(
    'Spender account, null when deleting specific serials (applies to all spenders)',
  ),
  serials: z
    .array(z.number())
    .nullable()
    .describe('Deleted serial numbers, null if all-serials blanket revoke'),
  allSerials: z
    .boolean()
    .describe('Whether the all-serials blanket approval was revoked'),
  network: NetworkSchema,
});

export type TokenDeleteAllowanceNftOutput = z.infer<
  typeof TokenDeleteAllowanceNftOutputSchema
>;

export const TOKEN_DELETE_ALLOWANCE_NFT_TEMPLATE = `
✅ NFT allowance deleted successfully!
   Token ID: {{hashscanLink tokenId "token" network}}
   Owner: {{hashscanLink ownerAccountId "account" network}}
{{#if allSerials}}
   Spender: {{hashscanLink spenderAccountId "account" network}}
   Scope: Revoked all-serials blanket approval
{{else}}
   Serials: {{serials}}
   Scope: Deleted allowance for all spenders
{{/if}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
