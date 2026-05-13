import type { CoreApi } from '@/core';
import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { PostOutputPreparationHookParams } from '@/core/hooks/types';
import type { Credential } from '@/core/services/kms/kms-types.interface';
import type { TokenAliasService } from '@/plugins/token/services/token-alias.service.interface';
import type { TokenAssociationsService } from '@/plugins/token/services/token-associations.service.interface';
import type { TokenStateService } from '@/plugins/token/services/token-state.service.interface';

import { OrchestratorResultSchema } from '@/core/hooks/orchestrator-result';
import {
  type BatchDataItem,
  OrchestratorSource,
  type TransactionResult,
} from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';
import { TOKEN_CREATE_NFT_FROM_FILE_COMMAND_NAME } from '@/plugins/token/commands/create-nft-from-file';
import { TokenAliasServiceImpl } from '@/plugins/token/services/token-alias.service';
import { TokenAssociationsServiceImpl } from '@/plugins/token/services/token-associations.service';
import { TokenStateServiceImpl } from '@/plugins/token/services/token-state.service';
import { buildNftTokenDataFromFile } from '@/plugins/token/utils/token-data-builders';

import { CreateNftFromFileNormalizedParamsSchema } from './types';

export class TokenCreateNftFromFileStateHook implements Hook<PostOutputPreparationHookParams> {
  constructor(
    private readonly tokenStateService: TokenStateService,
    private readonly tokenAliasService: TokenAliasService,
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
      (item) => item.command === TOKEN_CREATE_NFT_FROM_FILE_COMMAND_NAME,
    )) {
      await this.saveNft(api, batchDataItem);
    }
    return { breakFlow: false };
  }

  private async saveNft(
    api: CoreApi,
    batchDataItem: BatchDataItem,
  ): Promise<void> {
    const parseResult = CreateNftFromFileNormalizedParamsSchema.safeParse(
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

    const tokenData = buildNftTokenDataFromFile(
      innerTransactionResult,
      normalisedParams,
    );

    tokenData.associations =
      await this.tokenAssociationsService.processTokenAssociations(
        innerTransactionResult.tokenId,
        normalisedParams.associations as Credential[],
        normalisedParams.keyManager,
      );

    const key = composeKey(
      normalisedParams.network,
      innerTransactionResult.tokenId,
    );
    this.tokenStateService.saveToken(key, tokenData);
    api.logger.info('   Non-fungible token data saved to state');

    if (normalisedParams.alias) {
      if (
        this.tokenAliasService.exists(
          normalisedParams.alias,
          normalisedParams.network,
        )
      ) {
        api.logger.warn(
          `Alias "${normalisedParams.alias}" already exists, skipping registration`,
        );
      } else {
        this.tokenAliasService.register({
          alias: normalisedParams.alias,
          network: normalisedParams.network,
          tokenId: innerTransactionResult.tokenId,
          createdAt: innerTransactionResult.consensusTimestamp,
        });
        api.logger.info(`   Name registered: ${normalisedParams.alias}`);
      }
    }
  }
}

export const tokenCreateNftFromFileStateHook: Hook<PostOutputPreparationHookParams> =
  {
    execute: (params: PostOutputPreparationHookParams) => {
      const { api } = params.args;
      const tokenStateService = new TokenStateServiceImpl(
        api.state,
        api.logger,
      );
      return new TokenCreateNftFromFileStateHook(
        tokenStateService,
        new TokenAliasServiceImpl(api.alias),
        new TokenAssociationsServiceImpl(
          api.keyResolver,
          api.token,
          api.txSign,
          api.txExecute,
          tokenStateService,
          api.logger,
        ),
      ).execute(params);
    },
  };
