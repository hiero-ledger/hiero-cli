import type { CoreApi } from '@/core';
import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { PostOutputPreparationHookParams } from '@/core/hooks/types';

import { OrchestratorResultSchema } from '@/core/hooks/orchestrator-result';
import {
  type BatchDataItem,
  OrchestratorSource,
} from '@/core/types/shared.types';
import { ACCOUNT_DELETE_COMMAND_NAME } from '@/plugins/account/commands/delete/handler';
import { AccountDeleteNormalisedParamsSchema } from '@/plugins/account/hooks/account-delete-state/types';
import { AccountCleanupServiceImpl } from '@/plugins/account/services/account-cleanup.service';
import { AccountStateServiceImpl } from '@/plugins/account/services/account-state.service';

export class AccountDeleteStateHook implements Hook<PostOutputPreparationHookParams> {
  execute(params: PostOutputPreparationHookParams): Promise<HookResult> {
    const parsed = OrchestratorResultSchema.safeParse(
      params.executeTransactionResult,
    );
    if (!parsed.success || parsed.data.source !== OrchestratorSource.BATCH) {
      return Promise.resolve({ breakFlow: false });
    }

    const { api } = params.args;
    const batchData = parsed.data.batchData;

    if (!batchData.success) {
      return Promise.resolve({ breakFlow: false });
    }
    for (const batchDataItem of [...batchData.transactions].filter(
      (item) => item.command === ACCOUNT_DELETE_COMMAND_NAME,
    )) {
      this.removeAccountAfterBatch(api, batchDataItem);
    }
    return Promise.resolve({ breakFlow: false });
  }

  private removeAccountAfterBatch(
    api: CoreApi,
    batchDataItem: BatchDataItem,
  ): void {
    const parseResult = AccountDeleteNormalisedParamsSchema.safeParse(
      batchDataItem.normalizedParams,
    );
    if (!parseResult.success) {
      api.logger.warn(
        'Account delete batch state hook: normalized params did not match schema; skipping local state cleanup',
      );
      return;
    }
    const normalisedParams = parseResult.data;
    const accountState = new AccountStateServiceImpl(api.state, api.logger);
    const accountCleanup = new AccountCleanupServiceImpl(
      accountState,
      api.alias,
      api.kms,
      api.network,
      api.logger,
    );
    accountCleanup.removeAccountFromLocalState(
      normalisedParams.accountToDelete,
      normalisedParams.network,
    );
    accountCleanup.removeKmsCredentialIfUnusedAfterAccountRemoved(
      normalisedParams.accountToDelete,
    );
  }
}
