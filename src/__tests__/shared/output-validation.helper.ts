import type { z } from 'zod';

export function validateOutputSchema<T>(
  outputJson: string,
  schema: z.ZodType<T>,
): T {
  const parsed = JSON.parse(outputJson);
  return schema.parse(parsed);
}
