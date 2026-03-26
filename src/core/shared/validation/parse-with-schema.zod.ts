import type { z } from 'zod';

import { ValidationError } from '@/core/errors';

export function parseWithSchema<T>(
  schema: z.ZodType<T>,
  data: unknown,
  context: string,
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(`Invalid response (${context})`, {
      cause: result.error,
      context: { issues: result.error.issues },
    });
  }
  return result.data;
}
