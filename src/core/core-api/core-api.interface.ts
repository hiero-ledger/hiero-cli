/**
 * Main Core API interface that combines all services
 * This is the primary interface that plugins will use
 */
import type { AccountService } from '@/core/services/account/account-transaction-service.interface';
import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { ConfigService } from '@/core/services/config/config-service.interface';
import type { ContractCompilerService } from '@/core/services/contract-compiler/contract-compiler-service.interface';
import type { ContractTransactionService } from '@/core/services/contract-transaction/contract-transaction-service.interface';
import type { ContractVerifierService } from '@/core/services/contract-verifier/contract-verifier-service.interface';
import type { HbarService } from '@/core/services/hbar/hbar-service.interface';
import type { IdentifierResolverService } from '@/core/services/identifier-resolver/identifier-resolver-service.interface';
import type { KeyResolverService } from '@/core/services/key-resolver/key-resolver-service.interface';
import type { KmsService } from '@/core/services/kms/kms-service.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type { NetworkService } from '@/core/services/network/network-service.interface';
import type { OutputService } from '@/core/services/output/output-service.interface';
import type { PluginManagementService } from '@/core/services/plugin-management/plugin-management-service.interface';
import type { StateService } from '@/core/services/state/state-service.interface';
import type { TokenService } from '@/core/services/token/token-service.interface';
import type { TopicService } from '@/core/services/topic/topic-transaction-service.interface';
import type { TxExecutionService } from '@/core/services/tx-execution/tx-execution-service.interface';

export interface CoreApi {
  /**
   * Account operations
   */
  account: AccountService;

  /**
   * Token operations (creation, transfer, association with execution)
   */
  token: TokenService;

  /**
   * Topic transaction operations
   */
  topic: TopicService;

  /**
   * Transaction execution service
   */
  txExecution: TxExecutionService;

  /**
   * State management with namespaced access
   */
  state: StateService;

  /**
   * Mirror node data queries
   */
  mirror: HederaMirrornodeService;

  /**
   * Network management
   */
  network: NetworkService;

  /**
   * Configuration access
   */
  config: ConfigService;

  /**
   * Logging operations
   */
  logger: Logger;

  /**
   * Alias management (non-sensitive)
   */
  alias: AliasService;

  /**
   * Key Management Service (KMS)
   */
  kms: KmsService;

  /**
   * HBAR operations
   */
  hbar: HbarService;

  /**
   * Output handling and formatting
   */
  output: OutputService;

  /**
   * Plugin management state service
   */
  pluginManagement: PluginManagementService;

  /**
   * Service for resolving accounts from args to keys
   */
  keyResolver: KeyResolverService;
  contract: ContractTransactionService;
  contractCompiler: ContractCompilerService;
  contractVerifier: ContractVerifierService;
  identifierResolver: IdentifierResolverService;
}
