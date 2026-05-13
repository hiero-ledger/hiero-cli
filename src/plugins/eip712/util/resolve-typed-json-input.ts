import type { z } from 'zod';
import type { JsonInput } from '@/plugins/eip712/types/shared.types';

import { ValidationError } from '@/core/errors';

export function resolveTypedJsonInput<T>(
  input: JsonInput,
  schema: z.ZodType<T>,
): T {
  const result = schema.safeParse(input.value);
  if (!result.success) {
    throw new ValidationError(
      `JSON structure validation failed: ${result.error.issues
        .map(
          (i) => `${i.path.length ? i.path.join('.') : 'root'}: ${i.message}`,
        )
        .join('; ')}`,
    );
  }
  return result.data;
}
