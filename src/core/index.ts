/**
 * Main Core exports
 * Entry point for the entire Core API
 */

// Core API
export * from './core-api';

// Services
export * from './services/account/account-transaction-service.interface';
export type { ConfigService } from './services/config/config-service.interface';
export * from './services/logger/logger-service.interface';
export * from './services/mirrornode/hedera-mirrornode-service.interface';
export type { NetworkService } from './services/network/network-service.interface';
export * from './services/state/state-service.interface';
export * from './services/tx-execution/tx-execution-service.interface';

// Shared Types
export type {
  Account,
  Credentials,
  NetworkConfig,
  Script,
  Token,
  Topic,
} from './types/shared.types';

// Plugin Types
export type {
  CommandExecutionResult,
  CommandHandler,
  CommandOption,
  CommandOutputSpec,
  CommandSpec,
  PluginContext,
  PluginManifest,
  PluginStateSchema,
} from './plugins/plugin.types';

// Plugins
export * from './plugins/plugin.interface';
