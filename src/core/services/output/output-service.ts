import type { OutputService } from '@/core';
import type { OutputFormat } from '@/core/shared/types/output-format';
import type { FormatStrategyOptions } from './strategies';
import type { OutputHandlerOptions } from './types';

import { Status } from '@/core';
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

  handleOutput(options: OutputHandlerOptions): never {
    const { data, template, status } = options;
    const outputFormat = this.getFormat();

    const outputData = { status, ...data };

    const formatter = OutputFormatterFactory.getStrategy(outputFormat);
    const formatOptions: FormatStrategyOptions = { template, pretty: true };

    const formattedOutput = formatter.format(outputData, formatOptions);

    console.log(formattedOutput);
    process.exit(options.status === Status.Success ? 0 : 1);
  }

  emptyLine(): void {
    console.log('');
  }
}
