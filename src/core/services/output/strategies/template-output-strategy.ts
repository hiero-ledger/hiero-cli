/**
 * Template Output Strategy
 * Formats output data using Handlebars templates with the strategy pattern
 */
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { HashscanEntityType } from '@/core/utils/hashscan-link';
import type {
  FormatStrategyOptions,
  OutputFormatterStrategy,
} from './output-formatter-strategy.interface';

import * as Handlebars from 'handlebars';

import { InternalError } from '@/core/errors';
import { createHashscanLink } from '@/core/utils/hashscan-link';
import { isStringifiable } from '@/core/utils/is-stringifiable';

export class TemplateOutputStrategy implements OutputFormatterStrategy {
  constructor() {
    this.registerHelpers();
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerHelpers(): void {
    // Helper for equality comparison
    Handlebars.registerHelper('eq', function (a: unknown, b: unknown) {
      return a === b;
    });

    // Helper for greater than comparison
    Handlebars.registerHelper('gt', function (a: unknown, b: unknown) {
      if (typeof a === 'number' && typeof b === 'number') {
        return a > b;
      }
      if (typeof a === 'string' && typeof b === 'string') {
        return a > b;
      }
      return false;
    });

    // Helper for less than comparison
    Handlebars.registerHelper('lt', function (a: unknown, b: unknown) {
      if (typeof a === 'number' && typeof b === 'number') {
        return a < b;
      }
      if (typeof a === 'string' && typeof b === 'string') {
        return a < b;
      }
      return false;
    });

    // Helper for greater than or equal comparison
    Handlebars.registerHelper('gte', function (a: unknown, b: unknown) {
      if (typeof a === 'number' && typeof b === 'number') {
        return a >= b;
      }
      if (typeof a === 'string' && typeof b === 'string') {
        return a >= b;
      }
      return false;
    });

    // Helper for less than or equal comparison
    Handlebars.registerHelper('lte', function (a: unknown, b: unknown) {
      if (typeof a === 'number' && typeof b === 'number') {
        return a <= b;
      }
      if (typeof a === 'string' && typeof b === 'string') {
        return a <= b;
      }
      return false;
    });

    // Helper for adding 1 (for 1-based indexing)
    Handlebars.registerHelper('add1', function (value: number) {
      return value + 1;
    });

    // Helper for conditional rendering
    Handlebars.registerHelper(
      'if_eq',
      function (
        this: unknown,
        a: unknown,
        b: unknown,
        opts: Handlebars.HelperOptions,
      ) {
        if (a === b) {
          return opts.fn(this);
        }
        return opts.inverse(this);
      },
    );

    // Helper for creating Hashscan links
    Handlebars.registerHelper(
      'hashscanLink',
      function (
        entityId: unknown,
        entityType: unknown,
        network: unknown,
        displayText?: unknown,
      ): string {
        if (
          typeof entityId !== 'string' ||
          typeof entityType !== 'string' ||
          typeof network !== 'string'
        ) {
          return typeof entityId === 'string' ? entityId : '';
        }

        const text =
          typeof displayText === 'string' ? displayText : String(entityId);

        return createHashscanLink(
          network as SupportedNetwork,
          entityType as HashscanEntityType,
          entityId,
          text,
        );
      },
    );
  }

  /**
   * Format data using the strategy pattern
   */
  format(data: unknown, options: FormatStrategyOptions = {}): string {
    const { template } = options;

    if (template) {
      return this.formatWithTemplate(data, template);
    } else {
      // No template provided, use default formatting
      return this.formatDefault(data);
    }
  }

  /**
   * Format data using a Handlebars template
   */
  private formatWithTemplate(data: unknown, templateString: string): string {
    try {
      const template = Handlebars.compile(templateString);
      return template(data);
    } catch (error) {
      throw new InternalError('Failed to render template', { cause: error });
    }
  }

  /**
   * Format data with default template (simple JSON representation)
   */
  private formatDefault(data: unknown): string {
    // Default fallback: pretty-print the data in a readable format
    return this.formatAsKeyValue(data);
  }

  /**
   * Format data as key-value pairs (fallback when no template provided)
   */
  private formatAsKeyValue(data: unknown, indent = 0): string {
    const spaces = ' '.repeat(indent);

    if (data === null || data === undefined) {
      return `${spaces}${String(data)}`;
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        return `${spaces}[]`;
      }
      return data
        .map(
          (item, idx) =>
            `${spaces}[${idx}]\n${this.formatAsKeyValue(item, indent + 2)}`,
        )
        .join('\n');
    }

    if (typeof data === 'object') {
      const entries = Object.entries(data);
      if (entries.length === 0) {
        return `${spaces}{}`;
      }
      return entries
        .map(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            return `${spaces}${key}:\n${this.formatAsKeyValue(value, indent + 2)}`;
          }
          return `${spaces}${key}: ${isStringifiable(value) ? String(value) : '[Unsupported type]'}`;
        })
        .join('\n');
    }

    // Primitives can be safely converted to string
    if (isStringifiable(data)) {
      return `${spaces}${String(data)}`;
    }

    // Fallback for unexpected types (symbols, functions, etc.)
    return `${spaces}[Unsupported type: ${JSON.stringify(data)}]`;
  }
}
