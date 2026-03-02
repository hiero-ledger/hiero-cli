import type { OutputFormat } from '@/core/shared/types/output-format';

import { z } from 'zod';

import { ValidationError } from '@/core/errors';
import {
  DEFAULT_OUTPUT_FORMAT,
  OUTPUT_FORMATS,
} from '@/core/shared/types/output-format';
import { isStringifiable } from '@/core/utils/is-stringifiable';

const outputFormatSchema = z.enum(OUTPUT_FORMATS);

export function validateOutputFormat(outputFormat: unknown): OutputFormat {
  if (!outputFormat) return DEFAULT_OUTPUT_FORMAT;

  try {
    return outputFormatSchema.parse(outputFormat);
  } catch {
    const validFormats = OUTPUT_FORMATS.join(', ');
    throw new ValidationError(
      `Format '${isStringifiable(outputFormat) ? String(outputFormat) : JSON.stringify(outputFormat)}' is not supported. Valid formats: ${validFormats}`,
    );
  }
}

// Re-export for convenience
export type { OutputFormat };
export { OUTPUT_FORMATS };
