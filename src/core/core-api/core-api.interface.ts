/**
 * Main Core API interface that combines all services
 * This is the primary interface that plugins will use
 */
import { AccountService } from '../services/account/account-transaction-service.interface';
import { TxExecutionService } from '../services/tx-execution/tx-execution-service.interface';
import { TopicService } from '../services/topic/topic-transaction-service.interface';
import { StateService } from '../services/state/state-service.interface';
import { HederaMirrornodeService } from '../services/mirrornode/hedera-mirrornode-service.interface';
import { NetworkService } from '../services/network/network-service.interface';
import { ConfigService } from '../services/config/config-service.interface';
import { Logger } from '../services/logger/logger-service.interface';
import { HbarService } from '../services/hbar/hbar-service.interface';
import { AliasService } from '../services/alias/alias-service.interface';
import { KmsService } from '../services/kms/kms-service.interface';
import { TokenService } from '../services/token/token-service.interface';
import { OutputService } from '../services/output/output-service.interface';

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
}
