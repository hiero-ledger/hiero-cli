import type { ConfigService } from '@/core/services/config/config-service.interface';
import type { KeyResolverService } from '@/core/services/key-resolver/key-resolver-service.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { NetworkService } from '@/core/services/network/network-service.interface';
import type { PayerResolutionService } from './payer-resolution-service.interface';

import { KeySchema } from '@/core';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { KeyManager } from '@/core/services/kms/kms-types.interface';

export class PayerResolutionServiceImpl implements PayerResolutionService {
  constructor(
    private readonly keyResolver: KeyResolverService,
    private readonly network: NetworkService,
    private readonly config: ConfigService,
    private readonly logger: Logger,
  ) {}

  async resolvePayer(payerString: string): Promise<void> {
    const keyManager =
      this.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager) ??
      KeyManager.local;
    const parsedPayer = KeySchema.parse(payerString);
    const resolvedPayer = await this.keyResolver.resolveAccountCredentials(
      parsedPayer,
      keyManager,
      false,
      ['payer:override'],
    );
    this.network.setPayer(resolvedPayer);
    this.logger.debug(`[CLI] Resolved payer: ${resolvedPayer.accountId}`);
  }
}
