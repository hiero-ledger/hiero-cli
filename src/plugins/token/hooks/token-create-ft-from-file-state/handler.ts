import type { CoreApi } from '@/core';
import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { PostOutputPreparationHookParams } from '@/core/hooks/types';
import type { TokenAssociationsService } from '@/plugins/token/services/token-associations.service.interface';
import type { TokenStateService } from '@/plugins/token/services/token-state.service.interface';

import { OrchestratorResultSchema } from '@/core/hooks/orchestrator-result';
import {
  AliasType,
  type BatchDataItem,
  OrchestratorSource,
  type TransactionResult,
} from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';
import { TOKEN_CREATE_FT_FROM_FILE_COMMAND_NAME } from '@/plugins/token/commands/create-ft-from-file';
import { TokenAssociationsServiceImpl } from '@/plugins/token/services/token-associations.service';
import { TokenStateServiceImpl } from '@/plugins/token/services/token-state.service';
import { buildTokenDataFromFile } from '@/plugins/token/utils/token-data-builders';

import { CreateFtFromFileNormalizedParamsSchema } from './types';

export class TokenCreateFtFromFileStateHook implements Hook<PostOutputPreparationHookParams> {
  constructor(
    private readonly tokenStateService: TokenStateService,
    private readonly tokenAssociationsService: TokenAssociationsService,
  ) {}

  async execute(params: PostOutputPreparationHookParams): Promise<HookResult> {
    const parsed = OrchestratorResultSchema.safeParse(
      params.executeTransactionResult,
    );
    if (!parsed.success || parsed.data.source !== OrchestratorSource.BATCH) {
      return { breakFlow: false };
    }
    const batchData = parsed.data.batchData;
    const { api } = params.args;
    if (!batchData.success) {
      return { breakFlow: false };
    }
    for (const batchDataItem of [...batchData.transactions].filter(
      (item) => item.command === TOKEN_CREATE_FT_FROM_FILE_COMMAND_NAME,
    )) {
      await this.saveToken(api, batchDataItem);
    }
    return { breakFlow: false };
  }

  private async saveToken(
    api: CoreApi,
    batchDataItem: BatchDataItem,
  ): Promise<void> {
    const parseResult = CreateFtFromFileNormalizedParamsSchema.safeParse(
      batchDataItem.normalizedParams,
    );
    if (!parseResult.success) {
      api.logger.warn(
        `There was a problem with parsing data schema. The saving will not be done`,
      );
      return;
    }
    const normalisedParams = parseResult.data;
    const innerTransactionId = batchDataItem.transactionId;
    if (!innerTransactionId) {
      api.logger.warn(
        `No transaction ID found for batch transaction ${batchDataItem.order}`,
      );
      return;
    }

    const innerTransactionResult: TransactionResult =
      await api.receipt.getReceipt({
        transactionId: innerTransactionId,
      });

    if (!innerTransactionResult.tokenId) {
      api.logger.warn(
        'Transaction completed but did not return a token ID, skipping state save',
      );
      return;
    }

    const tokenData = buildTokenDataFromFile(
      innerTransactionResult,
      normalisedParams,
    );

    await this.tokenAssociationsService.processTokenAssociations(
      innerTransactionResult.tokenId,
      normalisedParams.associations,
      normalisedParams.keyManager,
    );

    const key = composeKey(
      normalisedParams.network,
      innerTransactionResult.tokenId,
    );
    this.tokenStateService.saveToken(key, tokenData);
    api.logger.info('   Token data saved to state');

    if (normalisedParams.alias) {
      if (api.alias.exists(normalisedParams.alias, normalisedParams.network)) {
        api.logger.warn(
          `Alias "${normalisedParams.alias}" already exists, skipping registration`,
        );
      } else {
        api.alias.register({
          alias: normalisedParams.alias,
          type: AliasType.Token,
          network: normalisedParams.network,
          entityId: innerTransactionResult.tokenId,
          createdAt: innerTransactionResult.consensusTimestamp,
        });
        api.logger.info(`   Name registered: ${normalisedParams.alias}`);
      }
    }
  }
}

export const tokenCreateFtFromFileStateHook: Hook<PostOutputPreparationHookParams> =
  {
    execute: (params: PostOutputPreparationHookParams) => {
      const { api } = params.args;
      const tokenStateService = new TokenStateServiceImpl(
        api.state,
        api.logger,
      );
      return new TokenCreateFtFromFileStateHook(
        tokenStateService,
        new TokenAssociationsServiceImpl(
          api.keyResolver,
          api.token,
          api.txSign,
          api.txExecute,
          api.logger,
        ),
      ).execute(params);
    },
  };
