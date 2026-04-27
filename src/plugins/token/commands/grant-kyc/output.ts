import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const TokenGrantKycOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  tokenId: EntityIdSchema,
  accountId: EntityIdSchema,
  network: NetworkSchema,
});

export type TokenGrantKycOutput = z.infer<typeof TokenGrantKycOutputSchema>;

export const TOKEN_GRANT_KYC_TEMPLATE = `
✅ KYC granted successfully!
   Account: {{accountId}}
   Token: {{hashscanLink tokenId "token" network}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
