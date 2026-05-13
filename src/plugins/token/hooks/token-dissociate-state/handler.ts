import type { CoreApi } from '@/core';
import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { PostOutputPreparationHookParams } from '@/core/hooks/types';
import type { BatchDataItem } from '@/core/types/shared.types';
import type { TokenStateService } from '@/plugins/token/services/token-state.service.interface';

import { OrchestratorSource } from '@/core';
import { OrchestratorResultSchema } from '@/core/hooks/orchestrator-result';
import { composeKey } from '@/core/utils/key-composer';
import { TOKEN_DISSOCIATE_COMMAND_NAME } from '@/plugins/token/commands/dissociate';
import { TokenStateServiceImpl } from '@/plugins/token/services/token-state.service';

import { DissociateNormalizedParamsSchema } from './types';

export class TokenDissociateStateHook implements Hook<PostOutputPreparationHookParams> {
  constructor(private readonly tokenStateService: TokenStateService) {}

  execute(params: PostOutputPreparationHookParams): Promise<HookResult> {
    const parsed = OrchestratorResultSchema.safeParse(
      params.executeTransactionResult,
    );
    if (!parsed.success) {
      return Promise.resolve({ breakFlow: false });
    }
    const orchestratorResult = parsed.data;
    if (orchestratorResult.source !== OrchestratorSource.BATCH) {
      return Promise.resolve({ breakFlow: false });
    }
    const batchData = orchestratorResult.batchData;
    const { api } = params.args;
    if (!batchData.success) {
      return Promise.resolve({ breakFlow: false });
    }
    for (const batchDataItem of [...batchData.transactions].filter(
      (item) => item.command === TOKEN_DISSOCIATE_COMMAND_NAME,
    )) {
      this.removeAssociations(api, batchDataItem);
    }
    return Promise.resolve({ breakFlow: false });
  }

  private removeAssociations(api: CoreApi, batchDataItem: BatchDataItem): void {
    const parseResult = DissociateNormalizedParamsSchema.safeParse(
      batchDataItem.normalizedParams,
    );
    if (!parseResult.success) {
      api.logger.warn(
        `There was a problem with parsing data schema. The saving will not be done`,
      );
      return;
    }
    const normalisedParams = parseResult.data;

    const tokenKey = composeKey(
      normalisedParams.network,
      normalisedParams.tokenId,
    );
    const tokenData = this.tokenStateService.getToken(tokenKey);
    if (!tokenData) return;

    this.tokenStateService.removeTokenAssociation(
      tokenKey,
      normalisedParams.account.accountId,
    );
    api.logger.info('   Association removed from token state');
  }
}

export const tokenDissociateStateHook: Hook<PostOutputPreparationHookParams> = {
  execute: (params: PostOutputPreparationHookParams) => {
    const { api } = params.args;
    return new TokenDissociateStateHook(
      new TokenStateServiceImpl(api.state, api.logger),
    ).execute(params);
  },
};
