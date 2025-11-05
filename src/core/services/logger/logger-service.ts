/**
 * Mock implementation of Logger Service
 * This is a placeholder implementation for testing the architecture
 * All logs are written to stderr to keep stdout clean for command output
 */
import { Logger } from './logger-service.interface';

export class MockLoggerService implements Logger {
  /**
   * Log a message (mock implementation)
   * Writes to stderr to keep stdout clean for command output
   */
  log(message: string): void {
    console.error(`[MOCK LOG] ${message}`);
  }

  /**
   * Log a verbose message (debug level) (mock implementation)
   * Writes to stderr to keep stdout clean for command output
   */
  verbose(message: string): void {
    console.error(`[MOCK VERBOSE] ${message}`);
  }

  /**
   * Log an error message (mock implementation)
   */
  error(message: string): void {
    console.error(`[MOCK ERROR] ${message}`);
  }

  /**
   * Log a warning message (mock implementation)
   */
  warn(message: string): void {
    console.warn(`[MOCK WARN] ${message}`);
  }

  /**
   * Log a debug message (mock implementation)
   * Writes to stderr to keep stdout clean for command output
   */
  debug(message: string): void {
    console.error(`[MOCK DEBUG] ${message}`);
  }
}
