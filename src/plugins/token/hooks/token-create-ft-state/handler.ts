import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { PostOutputPreparationHookParams } from '@/core/hooks/types';

import { OrchestratorResultSchema } from '@/core/hooks/orchestrator-result';
import { OrchestratorSource } from '@/core/types/shared.types';
import { TOKEN_CREATE_FT_COMMAND_NAME } from '@/plugins/token/commands/create-ft';
import { TokenStateServiceImpl } from '@/plugins/token/services/token-state.service';

export class TokenCreateFtStateHook implements Hook<PostOutputPreparationHookParams> {
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

    await Promise.all(
      parsed.data.batchData.transactions
        .filter((item) => item.command === TOKEN_CREATE_FT_COMMAND_NAME)
        .map((item) => tokenState.applyCreateFtFromBatchItem(item)),
    );
    return { breakFlow: false };
  }
}
