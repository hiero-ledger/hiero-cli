/**
 * Main Core API interface that combines all services
 * This is the primary interface that plugins will use
 */
import type { AccountService } from '@/core/services/account/account-transaction-service.interface';
import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { AllowanceService } from '@/core/services/allowance/allowance-service.interface';
import type { BatchTransactionService } from '@/core/services/batch/batch-transaction-service.interface';
import type { ConfigService } from '@/core/services/config/config-service.interface';
import type { ContractCompilerService } from '@/core/services/contract-compiler/contract-compiler-service.interface';
import type { ContractQueryService } from '@/core/services/contract-query/contract-query-service.interface';
import type { ContractTransactionService } from '@/core/services/contract-transaction/contract-transaction-service.interface';
import type { ContractVerifierService } from '@/core/services/contract-verifier/contract-verifier-service.interface';
import type { IdentityResolutionService } from '@/core/services/identity-resolution/identity-resolution-service.interface';
import type { KeyResolverService } from '@/core/services/key-resolver/key-resolver-service.interface';
import type { KmsService } from '@/core/services/kms/kms-service.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type { NetworkService } from '@/core/services/network/network-service.interface';
import type { OutputService } from '@/core/services/output/output-service.interface';
import type { PluginManagementService } from '@/core/services/plugin-management/plugin-management-service.interface';
import type { ReceiptService } from '@/core/services/receipt/receipt-service.interface';
import type { ScheduleTransactionService } from '@/core/services/schedule-transaction/schedule-transaction-service.interface';
import type { StateService } from '@/core/services/state/state-service.interface';
import type { TokenService } from '@/core/services/token/token-service.interface';
import type { TopicService } from '@/core/services/topic/topic-transaction-service.interface';
import type { TransferService } from '@/core/services/transfer/transfer-service.interface';
import type { TxExecuteService } from '@/core/services/tx-execute/tx-execute-service.interface';
import type { TxSignService } from '@/core/services/tx-sign/tx-sign-service.interface';

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
   * Transaction signing service
   */
  txSign: TxSignService;

  /**
   * Transaction execution service
   */
  txExecute: TxExecuteService;

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
   * Transfer operations (HBAR, FT, NFT transfers)
   */
  transfer: TransferService;

  /**
   * Allowance operations (HBAR, FT, NFT allowances)
   */
  allowance: AllowanceService;

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
  contractQuery: ContractQueryService;
  identityResolution: IdentityResolutionService;
  batch: BatchTransactionService;
  /**
   * Build ScheduleCreate / ScheduleSign / ScheduleDelete transactions (SDK builders).
   */
  schedule: ScheduleTransactionService;
  receipt: ReceiptService;
}
