import { z } from 'zod';
import { EntityReferenceSchema } from '@/core/schemas/common-schemas';

/**
 * Input schema for contract call command
 * Validates all user-provided arguments
 */
export const CallContractInputSchema = z.object({
  contract: EntityReferenceSchema.describe('Contract ID to call'),
  function: z.string().min(1, 'Function name is required'),
  params: z.string().optional(),
  gas: z.number().positive().int().optional().default(30000),
});

export type CallContractInput = z.infer<typeof CallContractInputSchema>;
