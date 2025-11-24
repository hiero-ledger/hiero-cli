/**
 * Mock implementation of Logger Service
 * This is a placeholder implementation for testing the architecture
 * All logs are written to stderr to keep stdout clean for command output
 */
import { Logger } from '../../core/services/logger/logger-service.interface';

export class MockTestLoggerService implements Logger {
  /**
   * Log a message (mock implementation)
   * Writes to stderr to keep stdout clean for command output
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  log(message: string): void {
    // console.log(`[MOCK LOG] ${message}`);
  }

  /**
   * Log a verbose message (debug level) (mock implementation)
   * Writes to stderr to keep stdout clean for command output
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  verbose(message: string): void {
    // console.log(`[MOCK VERBOSE] ${message}`);
  }

  /**
   * Log an error message (mock implementation)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  error(message: string): void {
    // console.log(`[MOCK ERROR] ${message}`);
  }

  /**
   * Log a warning message (mock implementation)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  warn(message: string): void {
    // console.log(`[MOCK WARN] ${message}`);
  }

  /**
   * Log a debug message (mock implementation)
   * Writes to stderr to keep stdout clean for command output
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  debug(message: string): void {
    // console.log(`[MOCK DEBUG] ${message}`);
  }
}
