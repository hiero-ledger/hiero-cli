/**
 * Output Service Implementation
 * Handles command output formatting and rendering using the strategy pattern
 */
import type { OutputFormat } from '@/core/shared/types/output-format';
import type { OutputService } from './output-service.interface';
import type { FormatStrategyOptions } from './strategies';
import type {
  HandleErrorOptions,
  HandleResultOptions,
  OutputHandlerOptions,
} from './types';

import * as fs from 'fs';
import * as path from 'path';

import { DEFAULT_OUTPUT_FORMAT } from '@/core/shared/types/output-format';
import { mapErrorToOutput } from '@/core/utils/error-mapper';

import { OutputFormatterFactory } from './strategies';

export class OutputServiceImpl implements OutputService {
  private currentFormat: OutputFormat;

  constructor(format: OutputFormat = DEFAULT_OUTPUT_FORMAT) {
    this.currentFormat = format;
  }

  setFormat(format: OutputFormat): void {
    this.currentFormat = format;
  }

  getFormat(): OutputFormat {
    return this.currentFormat;
  }

  handleResult(options: HandleResultOptions): void {
    const { result, template, format, outputPath } = options;
    const outputFormat = format ?? this.currentFormat;

    const data = {
      status: 'success',
      ...(typeof result === 'object' && result !== null ? result : { result }),
    };

    const formatter = OutputFormatterFactory.getStrategy(outputFormat);
    const formatOptions: FormatStrategyOptions = {
      template,
      pretty: true,
    };

    const formattedOutput = formatter.format(data, formatOptions);

    if (outputPath) {
      this.writeToFile(formattedOutput, outputPath);
    } else {
      console.log(formattedOutput);
    }
  }

  handleError(options: HandleErrorOptions): never {
    const { error, format, outputPath } = options;
    const outputFormat = format ?? this.currentFormat;

    const errorData = mapErrorToOutput(error);

    const formatter = OutputFormatterFactory.getStrategy(outputFormat);

    // For human format, we might want a different template for errors
    // but for PoC we use default behavior of the strategy
    const formattedOutput = formatter.format(errorData, { pretty: true });

    if (outputPath) {
      this.writeToFile(formattedOutput, outputPath);
    } else {
      // Errors go to stdout in this CLI design for consistency with success output
      console.log(formattedOutput);
    }

    process.exit(1);
  }

  /**
   * Handle command output - parse, validate, format, and output
   * @deprecated Use handleResult instead
   * @TODO POC_ERROR_HANDLING: Remove this method once all handlers are migrated to ADR-007
   */
  /**
   * Handle command output - parse, validate, format, and output
   * @deprecated Use handleResult instead
   * @TODO POC_ERROR_HANDLING: Remove this method once all handlers are migrated to ADR-007
   */
  handleCommandOutput(options: OutputHandlerOptions): void {
    const { outputJson, template, format, outputPath } = options;

    // Parse the JSON output
    let data: unknown;
    try {
      data = JSON.parse(outputJson);
    } catch (error) {
      throw new Error(
        `Failed to parse output JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // TODO: Validate against schema if provided
    // if (options.schema) {
    //   this.validateOutput(data, options.schema);
    // }

    // Format the data using the appropriate strategy
    const formatter = OutputFormatterFactory.getStrategy(format);
    const formatOptions: FormatStrategyOptions = {
      template,
      pretty: true,
    };

    const formattedOutput = formatter.format(data, formatOptions);

    // Output to destination
    if (outputPath) {
      this.writeToFile(formattedOutput, outputPath);
    } else {
      console.log(formattedOutput);
    }
  }

  private writeToFile(content: string, filePath: string): void {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, content, 'utf8');
    } catch (error) {
      throw new Error(
        `Failed to write output to file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
