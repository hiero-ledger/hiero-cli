import { z } from 'zod';

import { AccountReferenceObjectSchema } from '@/core/schemas/common-schemas';

export const FaucetRequestInputSchema = z.object({
  recipient: AccountReferenceObjectSchema,
  amount: z.coerce.number().int().min(1).max(100).optional().default(100),
});

export type FaucetRequestInput = z.infer<typeof FaucetRequestInputSchema>;
