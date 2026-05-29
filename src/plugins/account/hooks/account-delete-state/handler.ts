import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { PostOutputPreparationHookParams } from '@/core/hooks/types';

import { OrchestratorResultSchema } from '@/core/hooks/orchestrator-result';
import { OrchestratorSource } from '@/core/types/shared.types';
import { AccountStateServiceImpl } from '@/plugins/account/services/account-state.service';

export class AccountDeleteStateHook implements Hook<PostOutputPreparationHookParams> {
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
    const accountState = new AccountStateServiceImpl(
      api.state,
      api.logger,
      api.receipt,
      api.mirror,
      api.alias,
      api.kms,
      api.network,
    );

    for (const item of parsed.data.batchData.transactions) {
      await accountState.applyAccountDeleteFromBatchItem(item);
    }
    return { breakFlow: false };
  }
}
