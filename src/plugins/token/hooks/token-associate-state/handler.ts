import type { CoreApi } from '@/core';
import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { PostOutputPreparationHookParams } from '@/core/hooks/types';
import type { BatchDataItem } from '@/core/types/shared.types';
import type { TokenStateService } from '@/plugins/token/services/token-state.service.interface';

import { OrchestratorSource } from '@/core';
import { OrchestratorResultSchema } from '@/core/hooks/orchestrator-result';
import { composeKey } from '@/core/utils/key-composer';
import { TOKEN_ASSOCIATE_COMMAND_NAME } from '@/plugins/token/commands/associate';
import { TokenStateServiceImpl } from '@/plugins/token/services/token-state.service';

import { AssociateNormalizedParamsSchema } from './types';

export class TokenAssociateStateHook implements Hook<PostOutputPreparationHookParams> {
  constructor(private readonly tokenStateService: TokenStateService) {}

  execute(params: PostOutputPreparationHookParams): Promise<HookResult> {
    const parsed = OrchestratorResultSchema.safeParse(
      params.executeTransactionResult,
    );
    if (!parsed.success || parsed.data.source !== OrchestratorSource.BATCH) {
      return Promise.resolve({ breakFlow: false });
    }
    const batchData = parsed.data.batchData;
    const { api } = params.args;
    if (!batchData.success) {
      return Promise.resolve({ breakFlow: false });
    }
    for (const batchDataItem of [...batchData.transactions].filter(
      (item) => item.command === TOKEN_ASSOCIATE_COMMAND_NAME,
    )) {
      this.saveAssociations(api, batchDataItem);
    }
    return Promise.resolve({ breakFlow: false });
  }

  private saveAssociations(api: CoreApi, batchDataItem: BatchDataItem): void {
    const parseResult = AssociateNormalizedParamsSchema.safeParse(
      batchDataItem.normalizedParams,
    );
    if (!parseResult.success) {
      api.logger.warn(
        `There was a problem with parsing data schema. The saving will not be done`,
      );
      return;
    }
    const normalisedParams = parseResult.data;

    if (normalisedParams.alreadyAssociated) {
      api.logger.debug(
        `Skipping already associated token ${normalisedParams.tokenId} for account ${normalisedParams.account.accountId}`,
      );
      return;
    }

    const tokenKey = composeKey(
      normalisedParams.network,
      normalisedParams.tokenId,
    );
    const tokenData = this.tokenStateService.getToken(tokenKey);
    if (!tokenData) return;

    this.tokenStateService.addTokenAssociation(
      tokenKey,
      normalisedParams.account.accountId,
      normalisedParams.account.accountId,
    );
    api.logger.info('   Association saved to token state');
  }
}

export const tokenAssociateStateHook: Hook<PostOutputPreparationHookParams> = {
  execute: (params: PostOutputPreparationHookParams) => {
    const { api } = params.args;
    return new TokenAssociateStateHook(
      new TokenStateServiceImpl(api.state, api.logger),
    ).execute(params);
  },
};
