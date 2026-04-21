import type { TinybarsInput } from '@/core/types/shared.types';

import { ValidationError } from '@/core/errors';

export function normalizeTinybarsInput(value: TinybarsInput): string {
  if (typeof value === 'bigint') {
    if (value < 0n) {
      throw new ValidationError('Tinybars value must be non-negative', {
        context: {
          value: value.toString(),
        },
      });
    }
    return value.toString();
  }
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 0) {
      throw new ValidationError(
        'Tinybars number must be a non-negative integer',
        {
          context: {
            value,
          },
        },
      );
    }
    if (!Number.isSafeInteger(value)) {
      throw new ValidationError(
        'Tinybars number exceeds safe integer range; use string or bigint',
        {
          context: {
            value,
          },
        },
      );
    }
    return String(value);
  }
  const trimmed = value.trim();
  if (trimmed === '' || !/^\d+$/.test(trimmed)) {
    throw new ValidationError(
      'Tinybars string must be a non-negative integer',
      {
        context: {
          value,
        },
      },
    );
  }
  return trimmed;
}
