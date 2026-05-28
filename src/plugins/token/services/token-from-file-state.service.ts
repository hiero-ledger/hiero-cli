import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { Credential } from '@/core/services/kms/kms-types.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { ReceiptService } from '@/core/services/receipt/receipt-service.interface';
import type {
  BatchDataItem,
  TransactionResult,
} from '@/core/types/shared.types';
import type { TokenData } from '@/plugins/token/schema';
import type { TokenAssociationsService } from '@/plugins/token/services/token-associations.service.interface';
import type { TokenFromFileStateService } from '@/plugins/token/services/token-from-file-state.service.interface';
import type { TokenStateService } from '@/plugins/token/services/token-state.service.interface';

import { AliasType } from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';
import { CreateFtFromFileNormalizedParamsSchema } from '@/plugins/token/hooks/token-create-ft-from-file-state/types';
import { CreateNftFromFileNormalizedParamsSchema } from '@/plugins/token/hooks/token-create-nft-from-file-state/types';
import {
  buildNftTokenDataFromFile,
  buildTokenDataFromFile,
} from '@/plugins/token/utils/token-data-builders';

export class TokenFromFileStateServiceImpl implements TokenFromFileStateService {
  constructor(
    private readonly tokenState: TokenStateService,
    private readonly receipt: ReceiptService,
    private readonly alias: AliasService,
    private readonly tokenAssociations: TokenAssociationsService,
    private readonly logger: Logger,
  ) {}

  async applyCreateFtFromFileFromBatchItem(item: BatchDataItem): Promise<void> {
    const parsed = CreateFtFromFileNormalizedParamsSchema.safeParse(
      item.normalizedParams,
    );
    if (!parsed.success) {
      this.logger.warn(
        `There was a problem with parsing data schema. The saving will not be done`,
      );
      return;
    }
    const params = parsed.data;
    const receipt = await this.fetchReceiptOrWarn(item);
    if (!receipt || !receipt.tokenId) return;

    const tokenData = buildTokenDataFromFile(receipt, params);
    const associations = await this.tokenAssociations.processTokenAssociations(
      receipt.tokenId,
      params.associations as Credential[],
      params.keyManager,
    );
    tokenData.associations = associations;

    const key = composeKey(params.network, receipt.tokenId);
    this.tokenState.saveToken(key, tokenData);
    this.logger.info('   Token data saved to state');
    this.registerTokenAlias(params.alias, params.network, receipt);
  }

  async applyCreateNftFromFileFromBatchItem(
    item: BatchDataItem,
  ): Promise<void> {
    const parsed = CreateNftFromFileNormalizedParamsSchema.safeParse(
      item.normalizedParams,
    );
    if (!parsed.success) {
      this.logger.warn(
        `There was a problem with parsing data schema. The saving will not be done`,
      );
      return;
    }
    const params = parsed.data;
    const receipt = await this.fetchReceiptOrWarn(item);
    if (!receipt || !receipt.tokenId) return;

    const tokenData = buildNftTokenDataFromFile(receipt, params);
    const associations = await this.tokenAssociations.processTokenAssociations(
      receipt.tokenId,
      params.associations as Credential[],
      params.keyManager,
    );
    tokenData.associations = associations;

    const key = composeKey(params.network, receipt.tokenId);
    this.tokenState.saveToken(key, tokenData);
    this.logger.info('   Non-fungible token data saved to state');
    this.registerTokenAlias(params.alias, params.network, receipt);
  }

  private async fetchReceiptOrWarn(
    item: BatchDataItem,
  ): Promise<TransactionResult | null> {
    const transactionId = item.transactionId;
    if (!transactionId) {
      this.logger.warn(
        `No transaction ID found for batch transaction ${item.order}`,
      );
      return null;
    }
    const receipt = await this.receipt.getReceipt({ transactionId });
    if (!receipt.tokenId) {
      this.logger.warn(
        'Transaction completed but did not return a token ID, skipping state save',
      );
      return null;
    }
    return receipt;
  }

  private registerTokenAlias(
    aliasName: string | undefined,
    network: TokenData['network'],
    receipt: TransactionResult,
  ): void {
    if (!aliasName || !receipt.tokenId) return;
    if (this.alias.exists(aliasName, network)) {
      this.logger.warn(
        `Alias "${aliasName}" already exists, skipping registration`,
      );
      return;
    }
    this.alias.register({
      alias: aliasName,
      type: AliasType.Token,
      network,
      entityId: receipt.tokenId,
      createdAt: receipt.consensusTimestamp,
    });
    this.logger.info(`   Name registered: ${aliasName}`);
  }
}
