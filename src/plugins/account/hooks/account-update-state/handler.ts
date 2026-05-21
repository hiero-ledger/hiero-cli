import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { PostOutputPreparationHookParams } from '@/core/hooks/types';

import { OrchestratorResultSchema } from '@/core/hooks/orchestrator-result';
import { OrchestratorSource } from '@/core/types/shared.types';
import { AccountStateServiceImpl } from '@/plugins/account/services/account-state.service';

export class AccountUpdateStateHook implements Hook<PostOutputPreparationHookParams> {
  async execute(params: PostOutputPreparationHookParams): Promise<HookResult> {
    const parsed = OrchestratorResultSchema.safeParse(
      params.executeTransactionResult,
    );
    if (!parsed.success) {
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

    switch (parsed.data.source) {
      case OrchestratorSource.BATCH:
        if (!parsed.data.batchData.success) break;
        for (const item of parsed.data.batchData.transactions) {
          await accountState.applyAccountUpdateFromBatchItem(item);
        }
        break;
      case OrchestratorSource.SCHEDULE:
        await accountState.applyAccountUpdateFromSchedule(
          parsed.data.scheduledData,
        );
        break;
      default:
        break;
    }

    return { breakFlow: false };
  }
}
