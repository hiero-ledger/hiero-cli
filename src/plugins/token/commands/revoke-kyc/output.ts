import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const TokenRevokeKycOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  tokenId: EntityIdSchema,
  accountId: EntityIdSchema,
  network: NetworkSchema,
});

export type TokenRevokeKycOutput = z.infer<typeof TokenRevokeKycOutputSchema>;

export const TOKEN_REVOKE_KYC_TEMPLATE = `
✅ KYC revoked successfully!
   Account: {{accountId}}
   Token: {{hashscanLink tokenId "token" network}}
   Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
