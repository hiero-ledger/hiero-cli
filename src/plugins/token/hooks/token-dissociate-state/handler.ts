import type { CoreApi } from '@/core';
import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { PostOutputPreparationHookParams } from '@/core/hooks/types';
import type { BatchDataItem } from '@/core/types/shared.types';

import { OrchestratorSource } from '@/core';
import { OrchestratorResultSchema } from '@/core/hooks/orchestrator-result';
import { TOKEN_DISSOCIATE_COMMAND_NAME } from '@/plugins/token/commands/dissociate';
import { TokenAssociationsServiceImpl } from '@/plugins/token/services/token-associations.service';
import { TokenStateServiceImpl } from '@/plugins/token/services/token-state.service';

import { DissociateNormalizedParamsSchema } from './types';

export class TokenDissociateStateHook implements Hook<PostOutputPreparationHookParams> {
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

    const tokenState = new TokenStateServiceImpl(api.state, api.logger);
    const tokenAssociations = new TokenAssociationsServiceImpl(
      api.keyResolver,
      api.token,
      api.txSign,
      api.txExecute,
      tokenState,
      normalisedParams.keyManager,
      api.logger,
    );
    tokenAssociations.removeAssociationFromState(
      normalisedParams.tokenId,
      normalisedParams.account.accountId,
      normalisedParams.network,
    );
  }
}
