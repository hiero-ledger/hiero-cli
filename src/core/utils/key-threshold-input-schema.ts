import { z } from 'zod';

/**
 * Messages for the two standard threshold rules (per key role).
 * Wording is chosen at the call site so plugin commands can match existing CLI messages.
 */
export interface KeyThresholdPairMessages {
  thresholdWithoutEnoughKeys: string;
  thresholdExceedsKeyCount: string;
}

export interface KeyThresholdSuperRefinePair<T extends object> {
  thresholdField: Extract<keyof T, string>;
  getKeyCount: (data: T) => number;
  messages: KeyThresholdPairMessages;
}

/**
 * Validates M-of-N threshold fields inside a `.superRefine()` callback.
 * For each pair: if threshold is set, requires ≥ 2 keys and threshold ≤ key count.
 */
export function applyKeyThresholdSuperRefine<T extends object>(
  data: T,
  context: z.RefinementCtx,
  pairs: readonly KeyThresholdSuperRefinePair<T>[],
): void {
  for (const pair of pairs) {
    const threshold = data[pair.thresholdField];
    if (threshold === undefined) {
      continue;
    }
    const keyCount = pair.getKeyCount(data);
    if (keyCount < 2) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: pair.messages.thresholdWithoutEnoughKeys,
        path: [pair.thresholdField],
      });
    } else if (typeof threshold === 'number' && threshold > keyCount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: pair.messages.thresholdExceedsKeyCount,
        path: [pair.thresholdField],
      });
    }
  }
}
