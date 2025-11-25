import { LogLevel, Logger } from './logger-service.interface';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

export class LoggerService implements Logger {
  private currentLevel: LogLevel = 'info';

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[this.currentLevel];
  }

  private formatPrefix(level: LogLevel): string {
    switch (level) {
      case 'error':
        return '[ERROR]';
      case 'warn':
        return '[WARN]';
      case 'info':
        return '[INFO]';
      case 'debug':
        return '[DEBUG]';
      default:
        return '';
    }
  }

  private output(level: LogLevel, message: string): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const prefix = this.formatPrefix(level);
    const fullMessage = `${prefix} ${message}`;

    switch (level) {
      case 'error':
        console.error(fullMessage);
        break;
      case 'warn':
        console.warn(fullMessage);
        break;
      case 'info':
      case 'debug':
        console.error(fullMessage);
        break;
      default:
        console.error(fullMessage);
    }
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
