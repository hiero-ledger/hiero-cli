import type { Logger } from './logger-service.interface';

import { LogLevel } from '@/core/types/shared.types';

const LOG_LEVEL_DATA: Record<
  LogLevel,
  {
    priority: number;
    prefix: string;
  }
> = {
  silent: {
    priority: 0,
    prefix: '',
  },
  error: {
    priority: 1,
    prefix: '[ERROR]',
  },
  warn: {
    priority: 2,
    prefix: '[WARN]',
  },
  info: {
    priority: 3,
    prefix: '[INFO]',
  },
  debug: {
    priority: 4,
    prefix: '[DEBUG]',
  },
};

export class LoggerService implements Logger {
  private currentLevel: LogLevel = LogLevel.SILENT;

  private shouldLog(level: LogLevel): boolean {
    return (
      LOG_LEVEL_DATA[level].priority <=
      LOG_LEVEL_DATA[this.currentLevel].priority
    );
  }

  private formatPrefix(level: LogLevel): string {
    return LOG_LEVEL_DATA[level].prefix;
  }

  private output(level: LogLevel, message: string): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const prefix = this.formatPrefix(level);
    const fullMessage = `${prefix} ${message}`;
    console.error(fullMessage);
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  info(message: string): void {
    this.output(LogLevel.INFO, message);
  }

  error(message: string): void {
    this.output(LogLevel.ERROR, message);
  }

  warn(message: string): void {
    this.output(LogLevel.WARN, message);
  }

  debug(message: string): void {
    this.output(LogLevel.DEBUG, message);
  }
}
