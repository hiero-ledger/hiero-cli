import { ValidationError } from '@/core/errors';

/** `shard.realm.num@seconds.nanoseconds` (e.g. SDK `TransactionId.toString()`) */
const TRANSACTION_ID_AT_FORMAT = /^(\d+\.\d+\.\d+)@(\d+)\.(\d+)$/u;

/** Already converted: `shard.realm.num-seconds-nanoseconds` */
const TRANSACTION_ID_DASH_FORMAT = /^(\d+\.\d+\.\d+)-(\d+)-(\d+)$/u;

/**
 * Converts a Hedera transaction ID from the canonical `@` / dot form to the dash-separated form
 * often used in URLs and path segments.
 *
 * @example
 * formatTransactionIdToDashFormat('0.0.7900086@1775577354.363164462')
 * // → '0.0.7900086-1775577354-363164462'
 *
 * If the input is already in dash form, it is returned unchanged (after trim).
 */
export function formatTransactionIdToDashFormat(transactionId: string): string {
  const trimmed = transactionId.trim();
  if (trimmed === '') {
    throw new ValidationError('Transaction ID cannot be empty');
  }

  if (TRANSACTION_ID_DASH_FORMAT.test(trimmed)) {
    return trimmed;
  }

  const matchAt = trimmed.match(TRANSACTION_ID_AT_FORMAT);
  if (matchAt) {
    return `${matchAt[1]}-${matchAt[2]}-${matchAt[3]}`;
  }

  throw new ValidationError(
    `Invalid transaction ID format: expected "shard.realm.num@seconds.nanoseconds" or "shard.realm.num-seconds-nanoseconds", got "${trimmed}"`,
  );
}
