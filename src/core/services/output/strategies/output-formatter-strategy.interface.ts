/**
 * Output Formatter Strategy Interface
 * Defines the contract for output formatting strategies
 */
export interface OutputFormatterStrategy {
  /**
   * Format the given data according to the strategy
   * @param data The data to format
   * @param options Additional formatting options
   * @returns Formatted output string
   */
  format(data: unknown, options?: FormatStrategyOptions): string;
}

/**
 * Options for formatting strategies
 */
export interface FormatStrategyOptions {
  template?: string;
  pretty?: boolean;
}
