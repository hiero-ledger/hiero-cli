import { z } from 'zod';

import { NetworkSchema } from '@/core/schemas/common-schemas';

export const OperatorInfoSchema = z.object({
  accountId: z.string(),
  keyRefId: z.string(),
  publicKey: z.string().optional(),
});

export const NetworkNetworkSetOperatorOutputSchema = z.object({
  network: NetworkSchema,
  operator: OperatorInfoSchema,
});

export type SetOperatorOutput = z.infer<
  typeof NetworkNetworkSetOperatorOutputSchema
>;

export const NETWORK_NETWORK_SET_OPERATOR_TEMPLATE = `
✅ Operator configured for network: {{network}}
   Account ID: {{hashscanLink operator.accountId "account" network}}
   Key Reference ID: {{operator.keyRefId}}
   {{#if operator.publicKey}}Public Key: {{operator.publicKey}}{{/if}}
`.trim();
