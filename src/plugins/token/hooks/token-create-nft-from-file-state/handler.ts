import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { PostOutputPreparationHookParams } from '@/core/hooks/types';

import { OrchestratorResultSchema } from '@/core/hooks/orchestrator-result';
import { OrchestratorSource } from '@/core/types/shared.types';
import { TOKEN_CREATE_NFT_FROM_FILE_COMMAND_NAME } from '@/plugins/token/commands/create-nft-from-file';
import { TokenAssociationsServiceImpl } from '@/plugins/token/services/token-associations.service';
import { TokenFromFileStateServiceImpl } from '@/plugins/token/services/token-from-file-state.service';
import { TokenStateServiceImpl } from '@/plugins/token/services/token-state.service';

export class TokenCreateNftFromFileStateHook implements Hook<PostOutputPreparationHookParams> {
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
    const tokenAssociations = new TokenAssociationsServiceImpl(
      api.keyResolver,
      api.token,
      api.txSign,
      api.txExecute,
      api.logger,
    );
    const tokenState = new TokenStateServiceImpl(
      api.state,
      api.logger,
      api.receipt,
      api.alias,
    );
    const fromFileState = new TokenFromFileStateServiceImpl(
      tokenState,
      api.receipt,
      api.alias,
      tokenAssociations,
      api.logger,
    );

    for (const item of parsed.data.batchData.transactions.filter(
      (i) => i.command === TOKEN_CREATE_NFT_FROM_FILE_COMMAND_NAME,
    )) {
      await fromFileState.applyCreateNftFromFileFromBatchItem(item);
    }
    return { breakFlow: false };
  }
}
