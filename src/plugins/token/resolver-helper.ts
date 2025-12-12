/**
 * Token Plugin Parameter Resolvers
 * Helper functions to resolve command parameters (names, account IDs, keys)
 * using CoreApi services
 */
import { CoreApi } from '../../core';
import { SupportedNetwork } from '../../core/types/shared.types';
import { EntityIdSchema } from '../../core/schemas';

/**
 * Resolved destination account information (no private key needed)
 */
export interface ResolvedDestinationAccount {
  accountId: string;
}

/**
 * Parse and resolve destination account parameter
 * Can be:
 * - A name (resolved via alias service)
 * - An account-id (used directly)
 *
 * @param account - Account parameter from command
 * @param api - Core API instance
 * @param network - Current network
 * @returns Resolved destination account information
 */
export function resolveDestinationAccountParameter(
  account: string | undefined,
  api: CoreApi,
  network: SupportedNetwork,
): ResolvedDestinationAccount | null {
  if (!account) {
    return null;
  }

  // Check if it's already an account-id (format: 0.0.123456)
  const accountIdResult = EntityIdSchema.safeParse(account);
  if (accountIdResult.success) {
    return {
      accountId: account,
    };
  }

  // Try to resolve as a name
  const aliasRecord = api.alias.resolve(account, 'account', network);
  if (!aliasRecord) {
    throw new Error(
      `Account name "${account}" not found for network ${network}. ` +
        'Please provide either a valid name or account-id.',
    );
  }

  // Get the account ID from the name
  if (!aliasRecord.entityId) {
    throw new Error(
      `Account name "${account}" does not have an associated account ID`,
    );
  }

  return {
    accountId: aliasRecord.entityId,
  };
}

/**
 * Resolved token information
 */
export interface ResolvedToken {
  tokenId: string;
}

/**
 * Parse and resolve token parameter
 * Can be:
 * - A name (resolved via alias service)
 * - A token-id (used directly)
 *
 * @param tokenIdOrName - Token ID or name from command
 * @param api - Core API instance
 * @param network - Current network
 * @returns Resolved token information
 */
export function resolveTokenParameter(
  tokenIdOrName: string | undefined,
  api: CoreApi,
  network: SupportedNetwork,
): ResolvedToken | null {
  if (!tokenIdOrName) {
    return null;
  }

  // Check if it's already a token-id (format: 0.0.123456)
  const tokenIdResult = EntityIdSchema.safeParse(tokenIdOrName);
  if (tokenIdResult.success) {
    return {
      tokenId: tokenIdOrName,
    };
  }

  // Try to resolve as a name
  const aliasRecord = api.alias.resolve(tokenIdOrName, 'token', network);
  if (!aliasRecord) {
    throw new Error(
      `Token name "${tokenIdOrName}" not found for network ${network}. ` +
        'Please provide either a valid token name or token-id.',
    );
  }

  // Get the token ID from the name
  if (!aliasRecord.entityId) {
    throw new Error(
      `Token name "${tokenIdOrName}" does not have an associated token ID`,
    );
  }

  return {
    tokenId: aliasRecord.entityId,
  };
}
