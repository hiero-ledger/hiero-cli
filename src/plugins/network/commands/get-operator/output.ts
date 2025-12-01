import { z } from 'zod';
import { NetworkSchema } from '../../../../core/schemas/common-schemas';

export const OperatorInfoSchema = z.object({
  accountId: z.string(),
  keyRefId: z.string(),
  publicKey: z.string().optional(),
});

export const GetOperatorOutputSchema = z.object({
  network: NetworkSchema,
  operator: OperatorInfoSchema.optional(),
});

export type GetOperatorOutput = z.infer<typeof GetOperatorOutputSchema>;

export const GET_OPERATOR_TEMPLATE = `
{{#if operator}}
✅ Operator for network: {{network}}
   Account ID: {{operator.accountId}}
   Key Reference ID: {{operator.keyRefId}}
   {{#if operator.publicKey}}Public Key: {{operator.publicKey}}{{/if}}
{{else}}
⚠️  No operator configured for network: {{network}}
{{/if}}
`.trim();
