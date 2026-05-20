import { z } from 'zod';

import { JsonInputSchema } from '@/core/schemas';

export const Eip712HashInputSchema = z.object({
  domain: JsonInputSchema.describe(
    'EIP-712 domain as inline JSON or path to a JSON file',
  ),
  types: JsonInputSchema.describe(
    'EIP-712 types definition as inline JSON or path to a JSON file',
  ),
  message: JsonInputSchema.describe(
    'Message object as inline JSON or path to a JSON file',
  ),
});

export type Eip712HashInput = z.infer<typeof Eip712HashInputSchema>;
