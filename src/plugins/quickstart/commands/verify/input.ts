/**
 * Verify Command Input Schema
 */
import { z } from 'zod';

export const VerifyInputSchema = z.object({
  full: z.boolean().optional().default(false),
});

export type VerifyInput = z.infer<typeof VerifyInputSchema>;
