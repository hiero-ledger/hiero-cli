import type { z } from 'zod';

import { ZodError } from 'zod';

export function validateOutputSchema<T>(
  outputJson: string,
  schema: z.ZodTypeAny,
): T {
  const parsed = JSON.parse(outputJson);
  return schema.parse(parsed) as T;
}
