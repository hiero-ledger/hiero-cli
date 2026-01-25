import { z } from 'zod';
import { EntityReferenceSchema } from '@/core/schemas/common-schemas';

/**
 * Input schema for contract info command
 * Validates all user-provided arguments
 */
export const ContractInfoInputSchema = z.object({
  contract: EntityReferenceSchema.describe('Contract ID to get info for'),
});

export type ContractInfoInput = z.infer<typeof ContractInfoInputSchema>;
