/**
 * Core API Implementation
 * Combines all services into a single Core API instance
 */
import { CoreApi } from '../../core/core-api/core-api.interface';
import { AccountService } from '../../core/services/account/account-transaction-service.interface';
import { AliasService } from '../../core/services/alias/alias-service.interface';
import { ConfigService } from '../../core/services/config/config-service.interface';
import { Logger } from '../../core/services/logger/logger-service.interface';
import { HbarService } from '../../core/services/hbar/hbar-service.interface';
import { KmsService } from '../../core/services/kms/kms-service.interface';
import { HederaMirrornodeService } from '../../core/services/mirrornode/hedera-mirrornode-service.interface';
import { NetworkService } from '../../core/services/network/network-service.interface';
import { OutputService } from '../../core/services/output/output-service.interface';
import { StateService } from '../../core/services/state/state-service.interface';
import { TokenService } from '../../core/services/token/token-service.interface';
import { TopicService } from '../../core/services/topic/topic-transaction-service.interface';
import { TxExecutionService } from '../../core/services/tx-execution/tx-execution-service.interface';
import { CoreApiConfig } from '../../core/core-api/core-api-config';
import { ZustandGenericStateServiceImpl } from '../../core/services/state/state-service';
import { ConfigServiceImpl } from '../../core/services/config/config-service';
import { NetworkServiceImpl } from '../../core/services/network/network-service';
import { AliasServiceImpl } from '../../core/services/alias/alias-service';
import { KmsServiceImpl } from '../../core/services/kms/kms-service';
import { TxExecutionServiceImpl } from '../../core/services/tx-execution/tx-execution-service';
import { AccountServiceImpl } from '../../core/services/account/account-transaction-service';
import { TokenServiceImpl } from '../../core/services/token/token-service';
import { TopicServiceImpl } from '../../core/services/topic/topic-transaction-service';
import { HederaMirrornodeServiceDefaultImpl } from '../../core/services/mirrornode/hedera-mirrornode-service';
import { HbarServiceImpl } from '../../core/services/hbar/hbar-service';
import { OutputServiceImpl } from '../../core/services/output/output-service';
import { LedgerId } from '@hashgraph/sdk';
import { STATE_STORAGE_FILE_PATH } from '../test-constants';
import { MockTestLoggerService } from './mock-test-logger-service';
import { PluginManagementService } from '../../core/services/plugin-management/plugin-management-service.interface';
import { PluginManagementServiceImpl } from '../../core/services/plugin-management/plugin-management-service';

export class CoreApiMockImplementation implements CoreApi {
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

  constructor(config: CoreApiConfig) {
    this.logger = new MockTestLoggerService();
    this.state = new ZustandGenericStateServiceImpl(
      this.logger,
      STATE_STORAGE_FILE_PATH,
    );

    this.network = new NetworkServiceImpl(this.state, this.logger);

    // Initialize config service first (needed by KMS)
    this.config = new ConfigServiceImpl(this.state);

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
    let ledgerId: LedgerId;
    switch (networkString) {
      case 'mainnet':
        ledgerId = LedgerId.MAINNET;
        break;
      case 'testnet':
        ledgerId = LedgerId.TESTNET;
        break;
      case 'previewnet':
        ledgerId = LedgerId.PREVIEWNET;
        break;
      default:
        ledgerId = LedgerId.TESTNET;
    }

    this.mirror = new HederaMirrornodeServiceDefaultImpl(ledgerId);

    this.hbar = new HbarServiceImpl(this.logger);
    this.output = new OutputServiceImpl(config.format);

    this.pluginManagement = new PluginManagementServiceImpl(this.state);
  }
}

/**
 * Factory function to create a Core API instance
 */
export function createMockCoreApi(): CoreApi {
  const format: 'json' | 'human' = 'json';
  const config: CoreApiConfig = {
    format,
  };
  return new CoreApiMockImplementation(config);
}
