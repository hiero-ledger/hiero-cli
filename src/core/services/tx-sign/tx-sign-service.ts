import type {
  ContractCreateFlow,
  Transaction as HederaTransaction,
} from '@hashgraph/sdk';
import type { KmsService } from '@/core/services/kms/kms-service.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { NetworkService } from '@/core/services/network/network-service.interface';
import type { TxSignService } from './tx-sign-service.interface';

import { AccountId, TransactionId } from '@hashgraph/sdk';

import { StateError } from '@/core/errors';

export class TxSignServiceImpl implements TxSignService {
  private logger: Logger;
  private kms: KmsService;
  private networkService: NetworkService;

  constructor(logger: Logger, kms: KmsService, networkService: NetworkService) {
    this.logger = logger;
    this.kms = kms;
    this.networkService = networkService;
  }

  async sign(
    transaction: HederaTransaction,
    keyRefIds: string[],
  ): Promise<HederaTransaction> {
    this.logger.debug(`[TX-SIGN] Signing with ${keyRefIds.length} key(s)`);

    const network = this.networkService.getCurrentNetwork();
    const client = this.kms.createClient(network);
    const payer = this.networkService.getPayer();

    if (payer && transaction.isFrozen()) {
      client.close();
      throw new StateError(
        'Transaction is already frozen before setting requested payer',
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
