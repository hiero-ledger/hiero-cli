import { z } from 'zod';
import {
  EntityIdSchema,
  NetworkSchema,
  TinybarSchema,
  TransactionIdSchema,
} from '@/core/schemas/common-schemas';

export const TransferOutputSchema = z.object({
  transactionId: TransactionIdSchema,
  fromAccountId: EntityIdSchema,
  toAccountId: EntityIdSchema,
  amountTinybar: TinybarSchema,
  network: NetworkSchema,
  memo: z.string().optional(),
  status: z.string().optional().describe('Transaction status if available'),
});

export type TransferOutput = z.infer<typeof TransferOutputSchema>;

export const TRANSFER_TEMPLATE = `
✅ HBAR transfer submitted successfully

Transaction ID: {{transactionId}}
From: {{fromAccountId}}
To: {{toAccountId}}
Amount: {{amountTinybar}} tinybars
Network: {{network}}
{{#if memo}}
Memo: {{memo}}
{{/if}}
{{#if status}}
Status: {{status}}
{{/if}}
`.trim();
