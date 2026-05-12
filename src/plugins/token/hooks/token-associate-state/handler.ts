import type { CoreApi } from '@/core';
import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { PostOutputPreparationHookParams } from '@/core/hooks/types';
import type { BatchDataItem } from '@/core/types/shared.types';

import { OrchestratorSource } from '@/core';
import { OrchestratorResultSchema } from '@/core/hooks/orchestrator-result';
import { TOKEN_ASSOCIATE_COMMAND_NAME } from '@/plugins/token/commands/associate';
import { TokenAssociationsServiceImpl } from '@/plugins/token/services/token-associations.service';
import { TokenStateServiceImpl } from '@/plugins/token/services/token-state.service';

import { AssociateNormalizedParamsSchema } from './types';

export class TokenAssociateStateHook implements Hook<PostOutputPreparationHookParams> {
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
    tokenAssociations.saveAssociationToState(
      normalisedParams.tokenId,
      normalisedParams.account.accountId,
      normalisedParams.network,
    );
  }
}
