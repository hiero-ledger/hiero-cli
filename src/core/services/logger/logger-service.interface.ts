/**
 * Interface for logging operations
 * Provides consistent logging interface for plugins
 */
import type { LogLevel } from '@/core/types/shared.types';

export interface Logger {
  /**
   * Log an informational message
   */
  info(message: string): void;

  /**
   * Log an error message
   */
  error(message: string): void;

  /**
   * Log a warning message
   */
  warn(message: string): void;

  /**
   * Log a debug message
   */
  debug(message: string): void;

  /**
   * Set current minimal log level (messages below this level are filtered out)
   */
  setLevel(level: LogLevel): void;
}
