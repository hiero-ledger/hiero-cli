import { z } from 'zod';

import type { OutputFormat } from '@/core/shared/types/output-format';
import {
  DEFAULT_OUTPUT_FORMAT,
  OUTPUT_FORMATS,
} from '@/core/shared/types/output-format';
import { formatAndExitWithError } from '@/core/utils/error-handler';

// Zod schema from const array
const outputFormatSchema = z.enum(OUTPUT_FORMATS);

export function validateOutputFormat(outputFormat: unknown): OutputFormat {
  // Default to human if not provided
  if (!outputFormat) return DEFAULT_OUTPUT_FORMAT;

  try {
    return outputFormatSchema.parse(outputFormat);
  } catch (error) {
    // Dynamic list of valid formats
    const validFormats = OUTPUT_FORMATS.join(', ');
    formatAndExitWithError(
      'Invalid format option',
      new Error(
        `Format '${String(outputFormat)}' is not supported. Valid formats: ${validFormats}`,
      ),
    );
  }
}

// Re-export for convenience
export type { OutputFormat };
export { OUTPUT_FORMATS };
