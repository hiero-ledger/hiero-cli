/**
 * Init Command Input Schema
 */
import { z } from 'zod';

export const InitInputSchema = z.object({
  network: z.string().optional().default('testnet'),
  skipVerify: z.boolean().optional().default(false),
});

export type InitInput = z.infer<typeof InitInputSchema>;
