import type { CoreApi } from '@/core';
import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { PostOutputPreparationHookParams } from '@/core/hooks/types';
import type { BatchDataItem } from '@/core/types/shared.types';

import { OrchestratorSource } from '@/core';
import { OrchestratorResultSchema } from '@/core/hooks/orchestrator-result';
import { TOKEN_UPDATE_COMMAND_NAME } from '@/plugins/token/commands/update/handler';
import { TokenStateServiceImpl } from '@/plugins/token/services/token-state.service';
import { buildUpdatedTokenData } from '@/plugins/token/utils/token-data-builders';

import { TokenUpdateNormalisedParamsSchema } from './types';

export class TokenUpdateStateHook implements Hook<PostOutputPreparationHookParams> {
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
      (item) => item.command === TOKEN_UPDATE_COMMAND_NAME,
    )) {
      this.updateTokenState(api, batchDataItem);
    }

    return Promise.resolve({ breakFlow: false });
  }

  private updateTokenState(api: CoreApi, batchDataItem: BatchDataItem): void {
    const parseResult = TokenUpdateNormalisedParamsSchema.safeParse(
      batchDataItem.normalizedParams,
    );

    if (!parseResult.success) {
      api.logger.warn(
        'There was a problem with parsing data schema. The saving will not be done',
      );
      return;
    }

    const p = parseResult.data;
    const tokenState = new TokenStateServiceImpl(api.state, api.logger);
    const existing = tokenState.getToken(p.stateKey);

    const tokenData = buildUpdatedTokenData(p, p.tokenInfo, existing);

    tokenState.saveToken(p.stateKey, tokenData);
    api.logger.info(`   Token update state saved for ${p.tokenId}`);
  }
}
