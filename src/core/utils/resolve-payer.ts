import type { CoreApi } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';

import { PrivateKeySchema } from '@/core';

/**
 * Resolves payer from string (alias or account-id:private-key format)
 * and sets it in NetworkService
 *
 * @param payerString - Payer string from CLI flag (alias or account-id:private-key)
 * @param coreApi - Core API instance
 * @throws Error if payer cannot be resolved
 */
export async function resolvePayer(
  payerString: string,
  coreApi: CoreApi,
): Promise<void> {
  try {
    const keyManager =
      coreApi.config.getOption<KeyManagerName>('default_key_manager') ||
      'local';
    const parsedPayer = PrivateKeySchema.parse(payerString);
    const resolvedPayer = await coreApi.keyResolver.getOrInitKey(
      parsedPayer,
      keyManager,
      ['payer:override'],
    );
    coreApi.network.setPayer(resolvedPayer);
    coreApi.logger.debug(`[CLI] Resolved payer: ${resolvedPayer.accountId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to resolve payer: ${payerString}. ${errorMessage}`);
  }
}
