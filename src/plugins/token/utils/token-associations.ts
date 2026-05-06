/**
 * Token Associations
 * Utility functions for processing token associations
 */
import type { CoreApi, Logger } from '@/core';
import type {
  Credential,
  KeyManager,
} from '@/core/services/kms/kms-types.interface';

export async function processTokenAssociations(
  tokenId: string,
  associations: Credential[],
  api: CoreApi,
  logger: Logger,
  keyManager: KeyManager,
): Promise<Array<{ name: string; accountId: string }>> {
  if (associations.length === 0) {
    return [];
  }

  logger.info(`   Creating ${associations.length} token associations...`);
  const successfulAssociations: Array<{ name: string; accountId: string }> = [];

  for (const association of associations) {
    try {
      const account = await api.keyResolver.resolveAccountCredentials(
        association,
        keyManager,
        false,
        ['token:associate'],
      );

      const associateTransaction = api.token.createTokenAssociationTransaction({
        tokenId,
        accountId: account.accountId,
      });

      const transaction = await api.txSign.sign(associateTransaction, [
        account.keyRefId,
      ]);
      const associateResult = await api.txExecute.execute(transaction);

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
