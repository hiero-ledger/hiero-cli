import type { Hbar } from '@hiero-ledger/sdk';
import type { ConfigService } from '@/core/services/config/config-service.interface';

import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { parseMaxTransactionFee } from '@/core/utils/parse-max-transaction-fee';

/**
 * Resolves the optional default max transaction fee ceiling from persisted
 * config into an Hbar value.
 *
 * Returns `undefined` (meaning "no override, use SDK default") when the option
 * is unset or resolves to zero. See {@link parseMaxTransactionFee}.
 *
 * @param configService - Config service used to read the persisted option
 * @returns An Hbar ceiling, or undefined when no ceiling should be applied
 */
export function resolveDefaultMaxTransactionFee(
  configService: ConfigService,
): Hbar | undefined {
  return parseMaxTransactionFee(
    configService.getOption<string>(
      ConfigOptionKey.default_max_transaction_fee,
    ),
  );
}
