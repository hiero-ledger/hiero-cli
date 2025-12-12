/**
 * Token Associations
 * Utility functions for processing token associations
 */
import { CoreApi, Logger } from '../../../core';
import { toErrorMessage } from '../../../core/utils/errors';
import { KeyManagerName } from '../../../core/services/kms/kms-types.interface';
import { KeyOrAccountAlias } from '../../../core/schemas';
import { ZustandTokenStateHelper } from '../zustand-state-helper';

export function saveAssociationToState(
  tokenState: ZustandTokenStateHelper,
  tokenId: string,
  accountId: string,
  logger: Logger,
): void {
  const tokenData = tokenState.getToken(tokenId);
  if (tokenData) {
    tokenState.addTokenAssociation(tokenId, accountId, accountId);
    logger.info(`   Association saved to token state`);
  }
}

export async function processTokenAssociations(
  tokenId: string,
  associations: KeyOrAccountAlias[],
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
    } catch (error) {
      const associationIdentifier =
        association.type === 'keypair'
          ? association.accountId
          : association.alias;
      logger.warn(
        `   ⚠️  Failed to associate account ${associationIdentifier}: ${toErrorMessage(error)}`,
      );
    }
  }

  return successfulAssociations;
}
