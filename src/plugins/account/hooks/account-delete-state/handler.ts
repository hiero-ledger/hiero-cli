import type { CoreApi, Logger } from '@/core';
import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { PostOutputPreparationHookParams } from '@/core/hooks/types';
import type { BatchDataItem } from '@/core/types/shared.types';

import { OrchestratorResultSchema } from '@/core/hooks/orchestrator-result';
import { AccountHelper } from '@/plugins/account/account-helper';
import { ACCOUNT_DELETE_COMMAND_NAME } from '@/plugins/account/commands/delete/handler';
import { AccountDeleteNormalisedParamsSchema } from '@/plugins/account/hooks/account-delete-state/types';

export class AccountDeleteStateHook implements Hook<PostOutputPreparationHookParams> {
  execute(params: PostOutputPreparationHookParams): Promise<HookResult> {
    const parsed = OrchestratorResultSchema.safeParse(
      params.executeTransactionResult,
    );
    if (!parsed.success || parsed.data.source !== 'batch') {
      return Promise.resolve({ breakFlow: false });
    }

    const { api, logger } = params.args;
    const batchData = parsed.data.batchData;

    if (!batchData.success) {
      return Promise.resolve({ breakFlow: false });
    }
    for (const batchDataItem of [...batchData.transactions].filter(
      (item) => item.command === ACCOUNT_DELETE_COMMAND_NAME,
    )) {
      this.removeAccountAfterBatch(api, logger, batchDataItem);
    }
    return Promise.resolve({ breakFlow: false });
  }

  private removeAccountAfterBatch(
    api: CoreApi,
    logger: Logger,
    batchDataItem: BatchDataItem,
  ): void {
    const parseResult = AccountDeleteNormalisedParamsSchema.safeParse(
      batchDataItem.normalizedParams,
    );
    if (!parseResult.success) {
      logger.warn(
        'Account delete batch state hook: normalized params did not match schema; skipping local state cleanup',
      );
      return;
    }
    const normalisedParams = parseResult.data;
    const accountHelper = new AccountHelper(
      api.state,
      logger,
      api.alias,
      api.kms,
      api.network,
    );
    accountHelper.removeAccountFromLocalState(
      normalisedParams.accountToDelete,
      normalisedParams.network,
    );
    accountHelper.removeKmsCredentialIfUnusedAfterAccountRemoved(
      normalisedParams.accountToDelete,
    );
  }
}
