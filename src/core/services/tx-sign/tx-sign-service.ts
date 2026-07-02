import type {
  ContractCreateFlow,
  Transaction as HederaTransaction,
} from '@hiero-ledger/sdk';
import type { ConfigService } from '@/core/services/config/config-service.interface';
import type { KmsService } from '@/core/services/kms/kms-service.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { NetworkService } from '@/core/services/network/network-service.interface';
import type { TxSignService } from './tx-sign-service.interface';

import { AccountId, TransactionId } from '@hiero-ledger/sdk';

import { TransactionError } from '@/core/errors';
import { resolveDefaultMaxTransactionFee } from '@/core/utils/resolve-default-max-transaction-fee';

export class TxSignServiceImpl implements TxSignService {
  private logger: Logger;
  private kms: KmsService;
  private networkService: NetworkService;
  private configService: ConfigService;

  constructor(
    logger: Logger,
    kms: KmsService,
    networkService: NetworkService,
    configService: ConfigService,
  ) {
    this.logger = logger;
    this.kms = kms;
    this.networkService = networkService;
    this.configService = configService;
  }

  async sign(
    transaction: HederaTransaction,
    keyRefIds: string[],
  ): Promise<HederaTransaction> {
    this.logger.debug(`[TX-SIGN] Signing with ${keyRefIds.length} key(s)`);

    const network = this.networkService.getCurrentNetwork();
    const maxTransactionFee = resolveDefaultMaxTransactionFee(
      this.configService,
    );
    const client = this.kms.createClient({ network, maxTransactionFee });
    const payer = this.networkService.getPayer();

    if (payer && transaction.isFrozen()) {
      client.close();
      throw new TransactionError(
        'Transaction is already frozen before setting requested payer',
        false,
        { context: { payerAccountId: payer.accountId } },
      );
    }

    if (payer && payer.accountId && !transaction.isFrozen()) {
      const payerAccountId = AccountId.fromString(payer.accountId);
      const transactionId = TransactionId.generate(payerAccountId);
      transaction.setTransactionId(transactionId);
      this.logger.debug(
        `[TX-SIGN] Set transaction payer account ID: ${payer.accountId}`,
      );
    }

    if (!transaction.isFrozen()) {
      transaction.freezeWith(client);
    }

    client.close();

    const uniqueKeyRefIds = new Set<string>(keyRefIds);

    for (const keyRefId of uniqueKeyRefIds) {
      this.logger.debug(`[TX-SIGN] Signing with key: ${keyRefId}`);
      await this.kms.signTransaction(transaction, keyRefId);
    }

    if (payer && payer.keyRefId && !uniqueKeyRefIds.has(payer.keyRefId)) {
      this.logger.debug(`[TX-SIGN] Signing with payer key: ${payer.keyRefId}`);
      await this.kms.signTransaction(transaction, payer.keyRefId);
    }

    return transaction;
  }

  signContractCreateFlow(
    flow: ContractCreateFlow,
    keyRefIds: string[],
  ): ContractCreateFlow {
    this.logger.debug(
      `[TX-SIGN] Signing contract create flow with ${keyRefIds.length} key(s)`,
    );

    const uniqueKeyRefIds = new Set<string>(keyRefIds);

    for (const keyRefId of uniqueKeyRefIds) {
      this.logger.debug(`[TX-SIGN] Signing with key: ${keyRefId}`);
      this.kms.signContractCreateFlow(flow, keyRefId);
    }

    return flow;
  }
}
