/**
 * Output Formatter Factory
 * Creates and manages output formatting strategies
 */
import type { OutputFormat } from '@/core/shared/types/output-format';

import { JsonOutputStrategy } from './json-output-strategy';
import type { OutputFormatterStrategy } from './output-formatter-strategy.interface';
import { TemplateOutputStrategy } from './template-output-strategy';

export class OutputFormatterFactory {
  private static strategies: Map<OutputFormat, OutputFormatterStrategy> =
    new Map();

  /**
   * Get the appropriate strategy for the given format
   */
  static getStrategy(format: OutputFormat): OutputFormatterStrategy {
    if (!this.strategies.has(format)) {
      this.strategies.set(format, this.createStrategy(format));
    }
    return this.strategies.get(format)!;
  }

  /**
   * Create a new strategy instance for the given format
   */
  private static createStrategy(format: OutputFormat): OutputFormatterStrategy {
    switch (format) {
      case 'json':
        return new JsonOutputStrategy();
      case 'human':
        return new TemplateOutputStrategy();
      default:
        throw new Error(`Unsupported output format: ${String(format)}`);
    }
  }
}
