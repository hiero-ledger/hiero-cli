import { z } from 'zod';
import { formatAndExitWithError } from '../../utils/error-handler';
import {
  OUTPUT_FORMATS,
  OutputFormat,
  DEFAULT_OUTPUT_FORMAT,
} from '../types/output-format';
import { Logger } from '../../services/logger/logger-service.interface';

// Zod schema from const array
const outputFormatSchema = z.enum(OUTPUT_FORMATS);

export function validateOutputFormat(
  logger: Logger,
  outputFormat: unknown,
): OutputFormat {
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
      logger,
    );
  }
}

// Re-export for convenience
export { OutputFormat, OUTPUT_FORMATS };
