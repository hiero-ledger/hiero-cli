/**
 * Plugin System Type Definitions
 * Types specific to the plugin architecture
 */
import type { z } from 'zod';
import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { ConfigService } from '@/core/services/config/config-service.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { StateService } from '@/core/services/state/state-service.interface';
import type { Status } from '@/core/shared/constants';
import type { OptionType } from '@/core/types/shared.types';
import type { CommandHandlerArgs } from './plugin.interface';

/**
 * Plugin manifest structure
 */
export interface PluginManifest {
  name: string;
  version: string;
  displayName: string;
  description: string;
  commands: CommandSpec[];
}

/**
 * Command output specification
 * Defines the schema and optional human-readable template for command output
 */
export interface CommandOutputSpec {
  /** Zod schema for the command's output */
  schema: z.ZodTypeAny;
  /** Optional human-readable Handlebars template string */
  humanTemplate?: string;
}

/**
 * Command specification
 */
export interface CommandSpec {
  name: string;
  summary: string;
  description: string;
  options?: CommandOption[];
  handler: CommandHandler;
  output: CommandOutputSpec;
  excessArguments?: boolean;
  /** Handlebars template for pre-execution confirmation (human format only). Example: 'Delete account {{name}}?' */
  requireConfirmation?: string;
}

/**
 * Command option
 */
export interface CommandOption {
  name: string;
  type: OptionType;
  required: boolean;
  default?: unknown;
  description?: string;
  short?: string; // optional short flag alias like 'b' for -b
}

/**
 * Plugin context
 */
export interface PluginContext {
  api: CoreApi;
  state: StateService;
  config: ConfigService;
  logger: Logger;
}

/**
 * Command result
 */
export interface CommandResult {
  result: object;
}

export interface CommandExecutionResult {
  status: Status;
  /** Optional, present when status !== 'success'; intended for humans */
  errorMessage?: string;
  /** JSON string conforming to the manifest-declared output schema */
  outputJson?: string;
}

/**
 * Command handler
 */
export type CommandHandler = (
  args: CommandHandlerArgs,
  // @deprecated @todo - we need to remove CommandExecutionResult after migration to thrown based error handling
) => Promise<CommandResult | CommandExecutionResult>;

/**
 * Plugin state schema
 */
export interface PluginStateSchema {
  namespace: string;
  version: number;
  jsonSchema: object;
  scope: 'global' | 'profile' | 'plugin';
}
