/**
 * Token Associations
 * Utility functions for processing token associations
 */
import type { CoreApi, Logger, SupportedNetwork } from '@/core';
import type {
  Credential,
  KeyManagerName,
} from '@/core/services/kms/kms-types.interface';
import type { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { composeKey } from '@/core/utils/key-composer';

export function saveAssociationToState(
  tokenState: ZustandTokenStateHelper,
  tokenId: string,
  accountId: string,
  network: SupportedNetwork,
  logger: Logger,
): void {
  const tokenKey = composeKey(network, tokenId);
  const tokenData = tokenState.getToken(tokenKey);
  if (tokenData) {
    tokenState.addTokenAssociation(tokenKey, accountId, accountId);
    logger.info(`   Association saved to token state`);
  }
}

export async function processTokenAssociations(
  tokenId: string,
  associations: Credential[],
  api: CoreApi,
  logger: Logger,
  keyManager: KeyManagerName,
): Promise<Array<{ name: string; accountId: string }>> {
  if (associations.length === 0) {
    return [];
  }

  logger.info(`   Creating ${associations.length} token associations...`);
  const successfulAssociations: Array<{ name: string; accountId: string }> = [];

  for (const association of associations) {
    try {
      const account = await api.keyResolver.getOrInitKey(
        association,
        keyManager,
        ['token:associate'],
      );
      if (!account.accountId) {
        throw new Error(
          `Could not resolve account ID for passed "association" field for type ${association?.type} from value ${association?.rawValue}`,
        );
      }

      const associateTransaction = api.token.createTokenAssociationTransaction({
        tokenId,
        accountId: account.accountId,
      });

      const associateResult = await api.txExecution.signAndExecuteWith(
        associateTransaction,
        [account.keyRefId],
      );

      if (associateResult.success) {
        logger.info(`   ✅ Associated account ${account.accountId} with token`);
        successfulAssociations.push({
          name: account.accountId,
          accountId: account.accountId,
        });
      } else {
        logger.warn(`   ⚠️  Failed to associate account ${account.accountId}`);
      }
    } catch {
      logger.warn(`   ⚠️  Failed to associate account ${association.rawValue}`);
    }
  }

  return successfulAssociations;
}
