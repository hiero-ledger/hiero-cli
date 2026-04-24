import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TinybarSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const HbarAllowanceRevokeOutputSchema = z.object({
  ownerAccountId: EntityIdSchema,
  spenderAccountId: EntityIdSchema,
  amountTinybar: TinybarSchema,
  transactionId: TransactionIdSchema,
  network: NetworkSchema,
});

export type HbarAllowanceRevokeOutput = z.infer<
  typeof HbarAllowanceRevokeOutputSchema
>;

export const HBAR_ALLOWANCE_REVOKE_TEMPLATE = `
✅ HBAR allowance revoked successfully

Owner: {{hashscanLink ownerAccountId "account" network}}
Spender: {{hashscanLink spenderAccountId "account" network}}
Amount: {{amountTinybar}} tinybars
Network: {{network}}
Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
