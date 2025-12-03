/**
 * JSON Output Strategy
 * Formats output data as JSON using the strategy pattern
 */
import {
  OutputFormatterStrategy,
  FormatStrategyOptions,
} from './output-formatter-strategy.interface';

export class JsonOutputStrategy implements OutputFormatterStrategy {
  /**
   * Format data as JSON string
   */
  format(data: unknown, options: FormatStrategyOptions = {}): string {
    const { pretty = true } = options;

    if (pretty) {
      return JSON.stringify(data, null, 2);
    }
    return JSON.stringify(data);
  }
}
