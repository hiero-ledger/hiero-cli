/**
 * Token State Helper for Zustand State Management
 * Provides convenient methods for token state operations
 */
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { StateService } from '@/core/services/state/state-service.interface';
import type { MemoData } from './schema';

import { toErrorMessage } from '@/core/utils/errors';

import { MEMO_NAMESPACE, safeParseMemoData } from './schema';

export class ZustandMemoStateHelper {
  private state: StateService;
  private logger: Logger;

  constructor(state: StateService, logger: Logger) {
    this.state = state;
    this.logger = logger;
  }

  /**
   * Save a token to the state
   */
  saveMemo(accountId: string, memoData: MemoData): void {
    try {
      this.logger.debug(`[MEMO STATE] Saving memo ${accountId} to state`);

      const validation = safeParseMemoData(memoData);
      if (!validation.success) {
        const errors = validation.error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join(', ');
        throw new Error(`Invalid memo data: ${errors}`);
      }
      // Use the state service to save data in the memo namespace
      this.state.set(MEMO_NAMESPACE, accountId, memoData);

      this.logger.debug(
        `[MEMO STATE] Successfully saved message for ${accountId}`,
      );
    } catch (error) {
      this.logger.error(
        `[MEMO STATE] Failed to save memo for ${accountId}: ${toErrorMessage(error)}`,
      );
      throw error;
    }
  }

  /**
   * Get a memo from the state
   */
  getMemo(account: string): MemoData | null {
    try {
      this.logger.debug(`[MEMO STATE] Getting memo ${account} from state`);

      const memoData = this.state.get<MemoData>(MEMO_NAMESPACE, account);

      if (memoData) {
        this.logger.debug(`[MEMO STATE] Found memo ${account} in state`);
        return memoData;
      } else {
        this.logger.debug(`[MEMO STATE] Memo ${account} not found in state`);
        return null;
      }
    } catch (error) {
      this.logger.error(
        `[MEMO STATE] Failed to get memo ${account}: ${toErrorMessage(error)}`,
      );
      throw error;
    }
  }
}
