import { LogLevel, Logger } from './logger-service.interface';

const LOG_LEVEL_INFORMATION: Record<
  LogLevel,
  {
    priority: number;
    prefix: string;
  }
> = {
  error: {
    priority: 0,
    prefix: '[ERROR]',
  },
  warn: {
    priority: 1,
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
  private currentLevel: LogLevel = 'info';

  private shouldLog(level: LogLevel): boolean {
    return (
      LOG_LEVEL_INFORMATION[level] <= LOG_LEVEL_INFORMATION[this.currentLevel]
    );
  }

  private formatPrefix(level: LogLevel): string {
    return LOG_LEVEL_INFORMATION[level].prefix;
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
    this.output('info', message);
  }

  error(message: string): void {
    this.output('error', message);
  }

  warn(message: string): void {
    this.output('warn', message);
  }

  debug(message: string): void {
    this.output('debug', message);
  }
}
