import { z } from 'zod';

import { EntityIdSchema, NetworkSchema } from '@/core/schemas/common-schemas';

export const ImportTokenOutputSchema = z.object({
  tokenId: EntityIdSchema,
  name: z.string().describe('Token name or alias'),
  symbol: z.string().describe('Token symbol'),
  type: z
    .string()
    .describe('Token type (FUNGIBLE_COMMON or NON_FUNGIBLE_UNIQUE)'),
  network: NetworkSchema,
  memo: z.string().describe('Token memo').optional(),
  adminKeyPresent: z
    .boolean()
    .describe('Whether admin key is set on the token'),
  supplyKeyPresent: z
    .boolean()
    .describe('Whether supply key is set on the token'),
  alias: z.string().describe('Token alias').optional(),
});

export type ImportTokenOutput = z.infer<typeof ImportTokenOutputSchema>;

export const IMPORT_TOKEN_TEMPLATE = `
✅ Token imported successfully: {{hashscanLink tokenId "token" network}}
   Network: {{network}}
   Name (Alias): {{name}}
   Symbol: {{symbol}}
   Type: {{type}}
{{#if memo}}
   Memo: {{memo}}
{{/if}}
   Admin key: {{#if adminKeyPresent}}✅ Present{{else}}❌ Not set{{/if}}
   Supply key: {{#if supplyKeyPresent}}✅ Present{{else}}❌ Not set{{/if}}
{{#if alias}}
   Alias: {{alias}}
{{/if}}
`.trim();
