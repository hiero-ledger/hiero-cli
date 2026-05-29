import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { PostOutputPreparationHookParams } from '@/core/hooks/types';

import { OrchestratorSource } from '@/core';
import { OrchestratorResultSchema } from '@/core/hooks/orchestrator-result';
import { TOKEN_DELETE_COMMAND_NAME } from '@/plugins/token/commands/delete';
import { TokenStateServiceImpl } from '@/plugins/token/services/token-state.service';

export class TokenDeleteStateHook implements Hook<PostOutputPreparationHookParams> {
  async execute(params: PostOutputPreparationHookParams): Promise<HookResult> {
    const parsed = OrchestratorResultSchema.safeParse(
      params.executeTransactionResult,
    );
    if (!parsed.success || parsed.data.source !== OrchestratorSource.BATCH) {
      return { breakFlow: false };
    }
    if (!parsed.data.batchData.success) {
      return { breakFlow: false };
    }

    const { api } = params.args;
    const tokenState = new TokenStateServiceImpl(
      api.state,
      api.logger,
      api.receipt,
      api.alias,
    );

    for (const item of parsed.data.batchData.transactions.filter(
      (i) => i.command === TOKEN_DELETE_COMMAND_NAME,
    )) {
      await tokenState.applyDeleteFromBatchItem(item);
    }
    return { breakFlow: false };
  }
}
