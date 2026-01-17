import type { OutputFormat } from '@/core/shared/types/output-format';

import { z } from 'zod';

import { ValidationError } from '@/core/errors';
import {
  DEFAULT_OUTPUT_FORMAT,
  OUTPUT_FORMATS,
} from '@/core/shared/types/output-format';
import { isStringifiable } from '@/core/utils/is-stringifiable';

// Zod schema from const array
const outputFormatSchema = z.enum(OUTPUT_FORMATS);

export function validateOutputFormat(outputFormat: unknown): OutputFormat {
  // Default to human if not provided
  if (!outputFormat) return DEFAULT_OUTPUT_FORMAT;

  try {
    return outputFormatSchema.parse(outputFormat);
  } catch {
    // Dynamic list of valid formats
    const validFormats = OUTPUT_FORMATS.join(', ');
    throw new ValidationError(
      `Format '${isStringifiable(outputFormat) ? String(outputFormat) : JSON.stringify(outputFormat)}' is not supported. Valid formats: ${validFormats}`,
    );
  }
}

// Re-export for convenience
export type { OutputFormat };
export { OUTPUT_FORMATS };
