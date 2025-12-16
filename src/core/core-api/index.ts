/**
 * Core API exports
 * Main entry point for the Core API interfaces
 */

// Main Core API interface
export type { CoreApi } from './core-api.interface';

// Core API implementation
export { CoreApiImplementation, createCoreApi } from './core-api';

// Service interfaces
export type { AccountService } from '../services/account/account-transaction-service.interface';
export type { AliasService } from '../services/alias/alias-service.interface';
export type { ConfigService } from '../services/config/config-service.interface';
export type { HbarService } from '../services/hbar/hbar-service.interface';
export type { KmsService } from '../services/kms/kms-service.interface';
export type { Logger } from '../services/logger/logger-service.interface';
export type { NetworkService } from '../services/network/network-service.interface';
export type { StateService as GenericStateService } from '../services/state/state-service.interface';
export type { TxExecutionService } from '../services/tx-execution/tx-execution-service.interface';

// Plugin interfaces (ADR-001 compliant)
export type { CommandHandlerArgs } from '../plugins/plugin.interface';

// Re-export types for convenience
export type {
  CommandOption,
  CommandSpec,
  PluginContext,
  PluginManifest,
  PluginStateSchema,
} from '../plugins/plugin.types';
export type { CreateAccountParams } from '../services/account/account-transaction-service.interface';
export type {
  Account,
  Credentials,
  NetworkConfig,
  Script,
  Token,
  Topic,
} from '../types/shared.types';
