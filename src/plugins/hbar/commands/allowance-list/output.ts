import { z } from 'zod';

import {
  EntityIdSchema,
  NetworkSchema,
  TinybarSchema,
} from '@/core/schemas/common-schemas';

export const HbarAllowanceListEntrySchema = z.object({
  spenderAccountId: EntityIdSchema,
  amountTinybar: TinybarSchema,
  amountDisplay: z.string(),
});

export const HbarAllowanceListOutputSchema = z.object({
  accountId: EntityIdSchema,
  network: NetworkSchema,
  allowances: z.array(HbarAllowanceListEntrySchema),
  total: z.number(),
  hasMore: z.boolean(),
});

export type HbarAllowanceListOutput = z.infer<
  typeof HbarAllowanceListOutputSchema
>;

export const HBAR_ALLOWANCE_LIST_TEMPLATE = `
HBAR Allowances for {{accountId}} ({{network}})
{{#if allowances.length}}

{{#each allowances}}
  {{add1 @index}}. Spender: {{spenderAccountId}}   Amount: {{amountDisplay}} HBAR ({{amountTinybar}} tinybars)
{{/each}}
Total: {{total}} allowance(s)
{{else}}
  No HBAR allowances found.
{{/if}}
{{#if hasMore}}

Use --show-all to fetch all results.
{{/if}}
`.trim();
