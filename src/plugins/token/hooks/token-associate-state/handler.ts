import type { CoreApi, Logger } from '@/core';
import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { PostOutputPreparationHookParams } from '@/core/hooks/types';
import type { BatchDataItem } from '@/core/types/shared.types';

import { OrchestratorResultSchema } from '@/core/hooks/orchestrator-result';
import { TOKEN_ASSOCIATE_COMMAND_NAME } from '@/plugins/token/commands/associate';
import { saveAssociationToState } from '@/plugins/token/utils/token-associations';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { AssociateNormalizedParamsSchema } from './types';

export class TokenAssociateStateHook implements Hook<PostOutputPreparationHookParams> {
  execute(params: PostOutputPreparationHookParams): Promise<HookResult> {
    const parsed = OrchestratorResultSchema.safeParse(
      params.executeTransactionResult,
    );
    if (!parsed.success || parsed.data.source !== 'batch') {
      return Promise.resolve({ breakFlow: false });
    }
    const batchData = parsed.data.batchData;
    const { api, logger } = params.args;
    if (!batchData.success) {
      return Promise.resolve({ breakFlow: false });
    }
    for (const batchDataItem of [...batchData.transactions].filter(
      (item) => item.command === TOKEN_ASSOCIATE_COMMAND_NAME,
    )) {
      this.saveAssociations(api, logger, batchDataItem);
    }
    return Promise.resolve({ breakFlow: false });
  }

  private saveAssociations(
    api: CoreApi,
    logger: Logger,
    batchDataItem: BatchDataItem,
  ): void {
    const parseResult = AssociateNormalizedParamsSchema.safeParse(
      batchDataItem.normalizedParams,
    );
    if (!parseResult.success) {
      logger.warn(
        `There was a problem with parsing data schema. The saving will not be done`,
      );
      return;
    }
    const normalisedParams = parseResult.data;

    if (normalisedParams.alreadyAssociated) {
      logger.debug(
        `Skipping already associated token ${normalisedParams.tokenId} for account ${normalisedParams.account.accountId}`,
      );
      return;
    }

    const tokenState = new ZustandTokenStateHelper(api.state, logger);
    saveAssociationToState(
      tokenState,
      normalisedParams.tokenId,
      normalisedParams.account.accountId,
      normalisedParams.network,
      logger,
    );
  }
}
