/**
 * Core API Implementation
 * Combines all services into a single Core API instance
 */
import type { CoreApi } from '@/core';
import type { AccountService } from '@/core/services/account/account-transaction-service.interface';
import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { ConfigService } from '@/core/services/config/config-service.interface';
import type { HbarService } from '@/core/services/hbar/hbar-service.interface';
import type { KeyResolverService } from '@/core/services/key-resolver/key-resolver-service.interface';
import type { KmsService } from '@/core/services/kms/kms-service.interface';
import type {
  Logger,
  LogLevel,
} from '@/core/services/logger/logger-service.interface';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type { NetworkService } from '@/core/services/network/network-service.interface';
import type { OutputService } from '@/core/services/output/output-service.interface';
import type { PluginManagementService } from '@/core/services/plugin-management/plugin-management-service.interface';
import type { StateService } from '@/core/services/state/state-service.interface';
import type { TokenService } from '@/core/services/token/token-service.interface';
import type { TopicService } from '@/core/services/topic/topic-transaction-service.interface';
import type { TxExecutionService } from '@/core/services/tx-execution/tx-execution-service.interface';

import { AccountServiceImpl } from '@/core/services/account/account-transaction-service';
import { AliasServiceImpl } from '@/core/services/alias/alias-service';
import { ConfigServiceImpl } from '@/core/services/config/config-service';
import { HbarServiceImpl } from '@/core/services/hbar/hbar-service';
import { KeyResolverServiceImpl } from '@/core/services/key-resolver/key-resolver-service';
import { KmsServiceImpl } from '@/core/services/kms/kms-service';
import { LoggerService } from '@/core/services/logger/logger-service';
import { HederaMirrornodeServiceDefaultImpl } from '@/core/services/mirrornode/hedera-mirrornode-service';
import { NetworkServiceImpl } from '@/core/services/network/network-service';
import { OutputServiceImpl } from '@/core/services/output/output-service';
import { PluginManagementServiceImpl } from '@/core/services/plugin-management/plugin-management-service';
import { ZustandGenericStateServiceImpl } from '@/core/services/state/state-service';
import { TokenServiceImpl } from '@/core/services/token/token-service';
import { TopicServiceImpl } from '@/core/services/topic/topic-transaction-service';
import { TxExecutionServiceImpl } from '@/core/services/tx-execution/tx-execution-service';

export class CoreApiImplementation implements CoreApi {
  public account: AccountService;
  public token: TokenService;
  public txExecution: TxExecutionService;
  public topic: TopicService;
  public state: StateService;
  public mirror: HederaMirrornodeService;
  public network: NetworkService;
  public config: ConfigService;
  public logger: Logger;
  public alias: AliasService;
  public kms: KmsService;
  public hbar: HbarService;
  public output: OutputService;
  public pluginManagement: PluginManagementService;
  public keyResolver: KeyResolverService;

  constructor(storageDir?: string) {
    this.logger = new LoggerService();
    this.state = new ZustandGenericStateServiceImpl(this.logger, storageDir);

    this.network = new NetworkServiceImpl(this.state, this.logger);

    // Initialize config service first (needed by KMS)
    this.config = new ConfigServiceImpl(this.state);

    // Configure logger level from config service
    const configuredLogLevel = this.config.getOption<LogLevel>('log_level');
    this.logger.setLevel(configuredLogLevel);

    this.logger.info('🚀 Starting Hedera CLI...');

    // Initialize new services
    this.alias = new AliasServiceImpl(this.state, this.logger);
    this.kms = new KmsServiceImpl(
      this.logger,
      this.state,
      this.network,
      this.config,
    );
    this.txExecution = new TxExecutionServiceImpl(
      this.logger,
      this.kms,
      this.network,
    );

    // Initialize all services with dependencies
    this.account = new AccountServiceImpl(this.logger);
    this.token = new TokenServiceImpl(this.logger);
    this.topic = new TopicServiceImpl();

    // Convert network string to LedgerId
    const networkString = this.network.getCurrentNetwork();

    this.mirror = new HederaMirrornodeServiceDefaultImpl(networkString);
    this.keyResolver = new KeyResolverServiceImpl(
      this.mirror,
      this.alias,
      this.network,
      this.kms,
    );

    this.hbar = new HbarServiceImpl(this.logger);
    this.output = new OutputServiceImpl();

    this.pluginManagement = new PluginManagementServiceImpl(this.state);
  }
}

/**
 * Factory function to create a Core API instance
 */
export function createCoreApi(storageDir?: string): CoreApi {
  return new CoreApiImplementation(storageDir);
}
