import * as chalk from 'chalk';
import { getState } from '../state/store';

/**
 * Logger modes:
 *  normal  - standard logs + errors
 *  verbose - verbose + standard logs + errors
 *  quiet   - suppress standard logs & verbose (keep errors)
 *  silent  - suppress everything to user (still feeds jest spies)
 */
export type LoggerMode = 'normal' | 'verbose' | 'quiet' | 'silent';

interface LoggerTransport {
  log(msg: string): void;
  error(msg: string, error?: unknown): void;
}

class ConsoleTransport implements LoggerTransport {
  log(msg: string): void {
    // Write to stderr to keep stdout clean for command output
    console.error(msg); // eslint-disable-line no-console
  }

  error(msg: string, error?: unknown): void {
    if (error !== undefined) {
      console.error(msg, error); // eslint-disable-line no-console
    } else {
      console.error('Error:', msg); // eslint-disable-line no-console
    }
  }
}

class SilentTransport implements LoggerTransport {
  private isJestMock(fn: unknown): fn is { _isMockFunction: boolean } {
    return (
      typeof fn === 'function' &&
      typeof (fn as { _isMockFunction?: unknown })._isMockFunction === 'boolean'
    );
  }
  log(msg: string): void {
    // Write to stderr even in silent mode if Jest is mocking
    if (this.isJestMock(console.error)) console.error(msg); // eslint-disable-line no-console
  }

  error(msg: string, error?: unknown): void {
    if (this.isJestMock(console.error)) {
      if (error !== undefined)
        console.error(msg, error); // eslint-disable-line no-console
      else console.error('Error:', msg); // eslint-disable-line no-console
    }
  }
}

function serialize(value: string | object): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export class Logger {
  private static instance: Logger;
  private transport: LoggerTransport;
  private _mode: LoggerMode = 'normal';
  private isDebugMode: boolean = false;

  private constructor() {
    this.transport = new ConsoleTransport();
    this.configureFromEnv();
    this.updateDebugMode();
  }

  static getInstance(): Logger {
    if (!Logger.instance) Logger.instance = new Logger();
    return Logger.instance;
  }

  get mode(): LoggerMode {
    return this._mode;
  }

  setLevel(level: 'verbose' | 'quiet' | 'normal'): void {
    this._mode = ((): LoggerMode => {
      if (level === 'verbose') return 'verbose';
      if (level === 'quiet') return 'quiet';
      return 'normal';
    })();
  }

  setMode(mode: LoggerMode): void {
    this._mode = mode;
    if (mode === 'silent') this.transport = new SilentTransport();
  }

  setTransport(transport: LoggerTransport): void {
    this.transport = transport;
  }

  private configureFromEnv(): void {
    const explicit = process.env.HCLI_LOG_MODE as LoggerMode | undefined;
    if (explicit) this.setMode(explicit);
  }

  private updateDebugMode(): void {
    // Check environment variable first (highest priority)
    if (process.env.HCLI_DEBUG === 'true' || process.env.HCLI_DEBUG === '1') {
      this.isDebugMode = true;
      return;
    }

    // Check config file
    try {
      const state = getState();
      this.isDebugMode = state.debug === true;
    } catch (error) {
      // If we can't read config, default to false
      this.isDebugMode = false;
    }
  }

  public isDebugEnabled(): boolean {
    this.updateDebugMode(); // Refresh in case config changed
    return this.isDebugMode;
  }

  public debug(message: string, ...args: unknown[]): void {
    if (this.isDebugEnabled()) {
      // Write to stderr to keep stdout clean for command output
      console.error(chalk.blue(`🔍 DEBUG: ${message}`), ...args);
    }
  }

  log(message: string | object): void {
    if (this._mode === 'quiet') return;
    this.transport.log(serialize(message));
  }

  verbose(message: string | object): void {
    if (this._mode !== 'verbose') return;
    this.transport.log(serialize(message));
  }

  // Overload signatures preserved
  // eslint-disable-next-line @typescript-eslint/unified-signatures
  error(message: string | object): void;
  error(message: string, error: object): void;
  error(message: string | object, error?: object): void {
    const msg = serialize(message);
    this.transport.error(msg, error);
  }
}

export const logger = Logger.getInstance();
