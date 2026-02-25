import type { OutputService } from '@/core';
import type { ProcessExitService } from '@/core/services/process-exit/process-exit-service.interface';
import type { OutputFormat } from '@/core/shared/types/output-format';
import type { FormatStrategyOptions } from './strategies';
import type { OutputHandlerOptions } from './types';

import { Status } from '@/core';
import { ProcessExitServiceImpl } from '@/core/services/process-exit/process-exit-service';
import { DEFAULT_OUTPUT_FORMAT } from '@/core/shared/types/output-format';

import { OutputFormatterFactory } from './strategies';

export class OutputServiceImpl implements OutputService {
  private currentFormat: OutputFormat;
  private readonly processExit: ProcessExitService;

  constructor(
    format: OutputFormat = DEFAULT_OUTPUT_FORMAT,
    processExit: ProcessExitService = new ProcessExitServiceImpl(),
  ) {
    this.currentFormat = format;
    this.processExit = processExit;
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
    return this.processExit.exit(options.status === Status.Success ? 0 : 1);
  }

  emptyLine(): void {
    console.log('');
  }
}
