/**
 * Main Core exports
 * Entry point for the entire Core API
 *
 * This file exports all public APIs from the Core module.
 * Users should import everything from '@hiero-ledger/hiero-cli' or '@hiero-ledger/hiero-cli/core'.
 */

// ============================================================================
// Errors
// ============================================================================
export * from './errors';

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
export type * from './services/schedule-transaction/schedule-transaction-service.interface';
export type * from './services/state/state-service.interface';
export type * from './services/token/token-service.interface';
export type * from './services/topic/topic-transaction-service.interface';
export type { TransferService } from './services/transfer/transfer-service.interface';
export type { SwapTransferParams } from './services/transfer/types';
export { SwapTransferType } from './services/transfer/types';
export type * from './services/tx-execute/tx-execute-service.interface';
export type * from './services/tx-sign/tx-sign-service.interface';

// ============================================================================
// Shared Types
// ============================================================================
export type {
  Account,
  Credentials,
  Script,
  SolcCompiler,
  Token,
  Topic,
  TransactionReceipt,
  TransactionResult,
  TransactionStatus,
} from './types/shared.types';
export {
  AliasType,
  EntityReferenceType,
  MirrorTransactionResult,
  NetworkChainId,
  NetworkChainMap,
  OptionType,
  OrchestratorSource,
  SupplyType,
  SupportedNetwork,
} from './types/shared.types';
export type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
} from './types/transaction.types';

// ============================================================================
// Shared Constants
// ============================================================================
export {
  HASHSCAN_BASE_URL,
  HBAR_DECIMALS,
  HederaTokenType,
  KeyAlgorithm,
  MirrorTokenTypeToHederaTokenType,
  PLUGIN_INITIALIZED_DEFAULTS_KEY,
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
export { formatTransactionIdToDashFormat } from './utils/transaction-id-format-transformer';
export { zodToJsonSchema } from './utils/zod-to-json-schema';

// ============================================================================
// Plugin Types
// ============================================================================
export type { Hook, HookResult } from './hooks/hook.interface';
export {
  executePhaseHooks,
  processHookResult,
  resolveCommandHooks,
} from './hooks/hook-executor';
export type { OrchestratorResult } from './hooks/orchestrator-result';
export {
  BatchOrchestratorResult,
  OrchestratorResultSchema,
  ScheduleOrchestratorResult,
} from './hooks/orchestrator-result';
export type {
  HookPhase,
  PostOutputPreparationHookParams,
  PreBuildTransactionHookParams,
  PreExecuteTransactionHookParams,
  PreOutputPreparationHookParams,
  PreParamsNormalizationHookParams,
  PreSignTransactionHookParams,
} from './hooks/types';
export type {
  CommandHandler,
  CommandOption,
  CommandOutputSpec,
  CommandResult,
  CommandSpec,
  HookOption,
  HookSpec,
  Option,
  PluginContext,
  PluginManifest,
  PluginStateSchema,
  RegisteredHook,
} from './plugins/plugin.types';

// ============================================================================
// Plugin Interfaces
// ============================================================================
export type * from './plugins/plugin.interface';

// ============================================================================
// Commands
// ============================================================================
export { BaseTransactionCommand } from './commands/command';
export type { Command } from './commands/command.interface';
