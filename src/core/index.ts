/**
 * Main Core exports
 * Entry point for the entire Core API
 *
 * This file exports all public APIs from the Core module.
 * Users should import everything from '@hiero-ledger/hiero-cli' or '@hiero-ledger/hiero-cli/core'.
 */

// ============================================================================
// Core API
// ============================================================================
export * from './core-api';

// ============================================================================
// Service Interfaces
// ============================================================================
export type * from './services/account/account-transaction-service.interface';
export type * from './services/alias/alias-service.interface';
export type { ConfigService } from './services/config/config-service.interface';
export type * from './services/contract-compiler/contract-compiler-service.interface';
export type * from './services/contract-query/contract-query-service.interface';
export type * from './services/contract-transaction/contract-transaction-service.interface';
export type * from './services/contract-verifier/contract-verifier-service.interface';
export type * from './services/hbar/hbar-service.interface';
export type * from './services/identity-resolution/identity-resolution-service.interface';
export type * from './services/key-resolver/key-resolver-service.interface';
export type * from './services/kms/kms-service.interface';
export * from './services/logger/logger-service.interface';
export type * from './services/mirrornode/hedera-mirrornode-service.interface';
export type { NetworkService } from './services/network/network-service.interface';
export type * from './services/output/output-service.interface';
export type * from './services/plugin-management/plugin-management-service.interface';
export type * from './services/state/state-service.interface';
export type * from './services/token/token-service.interface';
export type * from './services/topic/topic-transaction-service.interface';
export type * from './services/tx-execution/tx-execution-service.interface';

// ============================================================================
// Shared Types
// ============================================================================
export type {
  Account,
  Credentials,
  Script,
  Token,
  Topic,
} from './types/shared.types';
export type { SolcCompiler } from './types/shared.types';
export {
  EntityReferenceType,
  NetworkChainId,
  NetworkChainMap,
  OptionType,
  SupplyType,
  SupportedNetwork,
} from './types/shared.types';

// ============================================================================
// Shared Constants
// ============================================================================
export {
  HASHSCAN_BASE_URL,
  HBAR_DECIMALS,
  HederaTokenType,
  KeyAlgorithm,
  MirrorTokenTypeToHederaTokenType,
  PLUGIN_MANAGEMENT_NAMESPACE,
  Status,
  TOKEN_BALANCE_LIMIT,
  TokenTypeMap,
} from './shared/constants';

// ============================================================================
// Schemas (Zod schemas for validation)
// ============================================================================
export * from './schemas';

// ============================================================================
// Utilities
// ============================================================================
export { formatError, toErrorMessage } from './utils/errors';
export { zodToJsonSchema } from './utils/zod-to-json-schema';

// ============================================================================
// Plugin Types
// ============================================================================
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

// ============================================================================
// Plugin Interfaces
// ============================================================================
export type * from './plugins/plugin.interface';
