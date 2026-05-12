import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TinybarSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const HbarAllowanceOutputSchema = z.object({
  ownerAccountId: EntityIdSchema,
  spenderAccountId: EntityIdSchema,
  amountTinybar: TinybarSchema,
  transactionId: TransactionIdSchema,
  network: NetworkSchema,
});

export type HbarAllowanceOutput = z.infer<typeof HbarAllowanceOutputSchema>;

export const HBAR_ALLOWANCE_TEMPLATE = `
✅ HBAR allowance approved successfully

Owner: {{hashscanLink ownerAccountId "account" network}}
Spender: {{hashscanLink spenderAccountId "account" network}}
Amount: {{amountTinybar}} tinybars
Network: {{network}}
Transaction ID: {{hashscanLink transactionId "transaction" network}}
`.trim();
