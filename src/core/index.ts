/**
 * Main Core exports
 * Entry point for the entire Core API
 */

// Core API
export * from './core-api';

// Services
export * from './services/account/account-transaction-service.interface';
export * from './services/tx-execution/tx-execution-service.interface';
export * from './services/state/state-service.interface';
export * from './services/mirrornode/hedera-mirrornode-service.interface';
export { NetworkService } from './services/network/network-service.interface';
export { ConfigService } from './services/config/config-service.interface';
export * from './services/logger/logger-service.interface';

// Shared Types
export type {
  Account,
  Token,
  Topic,
  Script,
  Credentials,
  NetworkConfig,
} from './types/shared.types';

// Plugin Types
export type {
  PluginManifest,
  CommandSpec,
  CommandOption,
  CommandOutputSpec,
  PluginContext,
  PluginStateSchema,
  CommandExecutionResult,
  CommandHandler,
} from './plugins/plugin.types';

// Plugins
export * from './plugins/plugin.interface';
