import type { ConfigService } from '@/core/services/config/config-service.interface';
import type { KeyResolverService } from '@/core/services/key-resolver/key-resolver-service.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { NetworkService } from '@/core/services/network/network-service.interface';

import { KeySchema } from '@/core';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { KeyManager } from '@/core/services/kms/kms-types.interface';

export async function resolvePayer(
  payerString: string,
  keyResolver: KeyResolverService,
  network: NetworkService,
  config: ConfigService,
  logger: Logger,
): Promise<void> {
  const keyManager =
    config.getOption<KeyManager>(ConfigOptionKey.default_key_manager) ??
    KeyManager.local;
  const parsedPayer = KeySchema.parse(payerString);
  const resolvedPayer = await keyResolver.resolveAccountCredentials(
    parsedPayer,
    keyManager,
    false,
    ['payer:override'],
  );
  network.setPayer(resolvedPayer);
  logger.debug(`[CLI] Resolved payer: ${resolvedPayer.accountId}`);
}
