import { z } from 'zod';
import { KeyRefIdSchema } from '../../../../core/schemas';

/**
 * Input schema for credentials remove command
 * Validates arguments for removing credentials from KMS storage
 */
export const RemoveCredentialsInputSchema = z.object({
  id: KeyRefIdSchema.describe('Key reference ID to remove from KMS'),
});

export type RemoveCredentialsInput = z.infer<
  typeof RemoveCredentialsInputSchema
>;
