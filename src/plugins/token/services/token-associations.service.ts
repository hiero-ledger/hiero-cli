import type { KeyResolverService } from '@/core/services/key-resolver/key-resolver-service.interface';
import type {
  Credential,
  KeyManager,
} from '@/core/services/kms/kms-types.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { TokenService } from '@/core/services/token/token-service.interface';
import type { TxExecuteService } from '@/core/services/tx-execute/tx-execute-service.interface';
import type { TxSignService } from '@/core/services/tx-sign/tx-sign-service.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type {
  TokenAssociationResult,
  TokenAssociationsService,
} from '@/plugins/token/services/token-associations.service.interface';
import type { TokenStateService } from '@/plugins/token/services/token-state.service.interface';

import { composeKey } from '@/core/utils/key-composer';

export class TokenAssociationsServiceImpl implements TokenAssociationsService {
  constructor(
    private readonly keyResolver: KeyResolverService,
    private readonly token: TokenService,
    private readonly txSign: TxSignService,
    private readonly txExecute: TxExecuteService,
    private readonly state: TokenStateService,
    private readonly logger: Logger,
  ) {}

  saveAssociationToState(
    tokenId: string,
    accountId: string,
    network: SupportedNetwork,
  ): void {
    const tokenKey = composeKey(network, tokenId);
    const tokenData = this.state.getToken(tokenKey);
    if (!tokenData) {
      return;
    }

    this.state.addTokenAssociation(tokenKey, accountId, accountId);
    this.logger.info('   Association saved to token state');
  }

  removeAssociationFromState(
    tokenId: string,
    accountId: string,
    network: SupportedNetwork,
  ): void {
    const tokenKey = composeKey(network, tokenId);
    const tokenData = this.state.getToken(tokenKey);
    if (!tokenData) {
      return;
    }

    this.state.removeTokenAssociation(tokenKey, accountId);
    this.logger.info('   Association removed from token state');
  }

  async processTokenAssociations(
    tokenId: string,
    associations: Credential[],
    keyManager: KeyManager,
  ): Promise<TokenAssociationResult[]> {
    if (associations.length === 0) {
      return [];
    }

    this.logger.info(
      `   Creating ${associations.length} token associations...`,
    );
    const successfulAssociations: TokenAssociationResult[] = [];

    for (const association of associations) {
      const result = await this.processTokenAssociation(
        tokenId,
        association,
        keyManager,
      );
      if (result) {
        successfulAssociations.push(result);
      }
    }

    return successfulAssociations;
  }

  private async processTokenAssociation(
    tokenId: string,
    association: Credential,
    keyManager: KeyManager,
  ): Promise<TokenAssociationResult | null> {
    try {
      const account = await this.keyResolver.resolveAccountCredentials(
        association,
        keyManager,
        false,
        ['token:associate'],
      );

      const associateTransaction = this.token.createTokenAssociationTransaction(
        {
          tokenId,
          accountId: account.accountId,
        },
      );
      const transaction = await this.txSign.sign(associateTransaction, [
        account.keyRefId,
      ]);
      const associateResult = await this.txExecute.execute(transaction);

      if (!associateResult.success) {
        this.logger.warn(
          `   ⚠️  Failed to associate account ${account.accountId}`,
        );
        return null;
      }

      this.logger.info(
        `   ✅ Associated account ${account.accountId} with token`,
      );
      return {
        name: account.accountId,
        accountId: account.accountId,
      };
    } catch {
      this.logger.warn(
        `   ⚠️  Failed to associate account ${association.rawValue}`,
      );
      return null;
    }
  }
}
