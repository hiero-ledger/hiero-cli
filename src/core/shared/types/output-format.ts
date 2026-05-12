/**
 * Output format types and constants
 * Single source of truth for output formats across the application
 */

// All valid output formats
export const OUTPUT_FORMATS = ['human', 'json'] as const;

// Output format type derived from the array
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

// Default format
export const DEFAULT_OUTPUT_FORMAT: OutputFormat = 'human';
