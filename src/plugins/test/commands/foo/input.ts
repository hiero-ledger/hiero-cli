import { z } from 'zod';

/**
 * Input schema for plugin-management add command
 * Validates arguments for adding a plugin from filesystem path
 */
export const FooTestInputSchema = z.object({
  message: z
    .string()
    .max(100, 'Message should have maximum of 100 characters')
    .describe('Message to print. Max size should be 100 characters'),
});

export type FooTestInput = z.infer<typeof FooTestInputSchema>;
