import type { Logger, StateService } from '@/core';
import type { MemoStateService } from '@/plugins/test/services/memo-state.service.interface';

import { ValidationError } from '@/core/errors';
import { MEMO_NAMESPACE } from '@/plugins/test/constants';
import { type MemoData, safeParseMemoData } from '@/plugins/test/schema';

export class MemoStateServiceImpl implements MemoStateService {
  private readonly namespace = MEMO_NAMESPACE;

  constructor(
    private readonly state: StateService,
    private readonly logger: Logger,
  ) {}

  saveMemo(accountId: string, memoData: MemoData): void {
    this.logger.debug(`[MEMO STATE] Saving memo ${accountId} to state`);

    const validation = safeParseMemoData(memoData);
    if (!validation.success) {
      throw ValidationError.fromZod(validation.error);
    }

    this.state.set(this.namespace, accountId, memoData);
    this.logger.debug(`[MEMO STATE] Successfully saved memo for ${accountId}`);
  }

  getMemo(account: string): MemoData | null {
    this.logger.debug(`[MEMO STATE] Getting memo ${account} from state`);

    const memoData = this.state.get<MemoData>(this.namespace, account);
    if (!memoData) {
      this.logger.debug(`[MEMO STATE] Memo ${account} not found in state`);
      return null;
    }

    const validation = safeParseMemoData(memoData);
    if (!validation.success) {
      this.logger.warn(`[MEMO STATE] Invalid memo data for ${account}`);
      return null;
    }

    this.logger.debug(`[MEMO STATE] Found memo ${account} in state`);
    return memoData;
  }
}
