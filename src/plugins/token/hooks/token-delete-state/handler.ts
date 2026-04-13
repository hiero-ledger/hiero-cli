import type { CoreApi, Logger } from '@/core';
import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { PostOutputPreparationHookParams } from '@/core/hooks/types';
import type { BatchDataItem } from '@/core/types/shared.types';

import { OrchestratorResultSchema } from '@/core/hooks/orchestrator-result';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { composeKey } from '@/core/utils/key-composer';
import { TOKEN_DELETE_COMMAND_NAME } from '@/plugins/token/commands/delete';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { DeleteNormalizedParamsSchema } from './types';

export class TokenDeleteStateHook implements Hook<PostOutputPreparationHookParams> {
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
      (item) => item.command === TOKEN_DELETE_COMMAND_NAME,
    )) {
      this.cleanupState(api, logger, batchDataItem);
    }

    return Promise.resolve({ breakFlow: false });
  }

  private cleanupState(
    api: CoreApi,
    logger: Logger,
    batchDataItem: BatchDataItem,
  ): void {
    const parseResult = DeleteNormalizedParamsSchema.safeParse(
      batchDataItem.normalizedParams,
    );

    if (!parseResult.success) {
      logger.warn('Problem parsing delete batch data. State cleanup skipped.');
      return;
    }

    const { network, tokenId } = parseResult.data;
    const tokenState = new ZustandTokenStateHelper(api.state, logger);
    const key = composeKey(network, tokenId);
    const tokenInState = tokenState.getToken(key);

    if (!tokenInState) return;

    const aliases = api.alias
      .list({ network, type: AliasType.Token })
      .filter((rec) => rec.entityId === tokenId);

    for (const rec of aliases) {
      api.alias.remove(rec.alias, network);
    }

    tokenState.removeToken(key);
    logger.debug(`Cleaned up state for deleted token ${tokenId}`);
  }
}
