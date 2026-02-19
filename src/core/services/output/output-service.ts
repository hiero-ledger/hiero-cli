import type { OutputFormat } from '@/core/shared/types/output-format';
import type { OutputService } from './output-service.interface';
import type { FormatStrategyOptions } from './strategies';
import type { OutputHandlerOptions, OutputOptions } from './types';

import * as fs from 'fs';
import * as path from 'path';

import { FileError, InternalError } from '@/core/errors';
import { DEFAULT_OUTPUT_FORMAT } from '@/core/shared/types/output-format';

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

  handleOutput(options: OutputHandlerOptions): void {
    const { data, template, status } = options;
    const outputFormat = this.getFormat();

    const outputData = { status, ...data };

    const formatter = OutputFormatterFactory.getStrategy(outputFormat);
    const formatOptions: FormatStrategyOptions = { template, pretty: true };

    const formattedOutput = formatter.format(outputData, formatOptions);

    console.log(formattedOutput);
  }

  handleCommandOutput(options: OutputOptions): void {
    const { outputJson, template, format, outputPath } = options;

    let data: unknown;
    try {
      data = JSON.parse(outputJson);
    } catch (error) {
      throw new InternalError('Failed to parse output JSON', { cause: error });
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

  emptyLine(): void {
    console.log('');
  }

  private writeToFile(content: string, filePath: string): void {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, content, 'utf8');
    } catch (error) {
      if (error instanceof FileError) throw error;
      throw new FileError(`Failed to write output to file ${filePath}`, {
        context: { path: filePath },
        cause: error,
      });
    }
  }
}
