/**
 * Token Plugin Parameter Resolvers
 * Helper functions to resolve command parameters (names, account IDs, keys)
 * using CoreApi services
 */
import { CoreApi } from '../../core';
import { SupportedNetwork } from '../../core/types/shared.types';
import { validateAccountId } from '../../core/utils/account-id-validator';
import { parseIdKeyPair } from '../../core/utils/keys';
import { PrivateKeyWithTypeSchema } from '../../core/schemas/common-schemas';
import type { KeyAlgorithmType as KeyAlgorithmType } from '../../core/services/kms/kms-types.interface';
import { KeyAlgorithm } from '../../core/shared/constants';
import { KeyManagerName } from '../../core/services/kms/kms-types.interface';

/**
 * Resolved treasury information
 */
export interface ResolvedTreasury {
  treasuryId: string;
  treasuryKeyRefId: string;
  treasuryPublicKey: string;
}

/**
 * Parse and resolve treasury parameter
 * Can be:
 * - A name (resolved via alias service)
 * - A treasury-id:treasury-key pair
 *
 * @param treasury - Treasury parameter from command
 * @param api - Core API instance
 * @param network - Current network
 * @returns Resolved treasury information
 */
export function resolveTreasuryParameter(
  treasury: string | undefined,
  api: CoreApi,
  network: SupportedNetwork,
  keyManager: KeyManagerName,
): ResolvedTreasury | null {
  if (!treasury) {
    return null;
  }

  // Check if it's a treasury-id:treasury-key pair
  if (treasury.includes(':')) {
    const { accountId, privateKey, keyType } = parseIdKeyPair(treasury);
    validateAccountId(accountId);
    // Default to ecdsa if keyType is not provided
    const keyTypeToUse: KeyAlgorithmType = keyType || KeyAlgorithm.ECDSA;
    const imported = api.kms.importPrivateKey(
      keyTypeToUse,
      privateKey,
      keyManager,
      ['token:treasury', 'temporary'],
    );
    return {
      treasuryId: accountId,
      treasuryKeyRefId: imported.keyRefId,
      treasuryPublicKey: imported.publicKey,
    };
  }

  // Try to resolve as a name
  const aliasRecord = api.alias.resolve(treasury, 'account', network);
  if (!aliasRecord) {
    throw new Error(
      `Treasury name "${treasury}" not found for network ${network}. ` +
        'Please provide either a valid name or treasury-id:treasury-key pair.',
    );
  }

  // Get the account ID and key from the name
  if (!aliasRecord.entityId) {
    throw new Error(
      `Treasury name "${treasury}" does not have an associated account ID`,
    );
  }

  if (!aliasRecord.keyRefId) {
    throw new Error(
      `Treasury name "${treasury}" does not have an associated key`,
    );
  }

  // Get the public key
  const publicKey = api.kms.getPublicKey(aliasRecord.keyRefId);
  if (!publicKey) {
    throw new Error(
      `Treasury name "${treasury}" key not found in credentials state`,
    );
  }

  return {
    treasuryId: aliasRecord.entityId,
    treasuryKeyRefId: aliasRecord.keyRefId,
    treasuryPublicKey: publicKey,
  };
}

/**
 * Resolved account information
 */
export interface ResolvedAccount {
  accountId: string;
  accountKeyRefId: string;
  accountPublicKey: string;
}

/**
 * Parse and resolve account parameter
 * Can be:
 * - A name (resolved via alias service)
 * - An account-id:account-key pair
 *
 * @param account - Account parameter from command
 * @param api - Core API instance
 * @param network - Current network
 * @param keyManager - Key Manager config overwrite
 * @returns Resolved account information
 */
export function resolveAccountParameter(
  account: string | undefined,
  api: CoreApi,
  network: SupportedNetwork,
  keyManager: KeyManagerName,
): ResolvedAccount | null {
  if (!account) {
    return null;
  }

  // Check if it's an account-id:account-key pair
  if (account.includes(':')) {
    const { accountId, privateKey, keyType } = parseIdKeyPair(account);
    validateAccountId(accountId);
    // Default to ecdsa if keyType is not provided
    const keyTypeToUse: KeyAlgorithmType = keyType || KeyAlgorithm.ECDSA;
    const imported = api.kms.importPrivateKey(
      keyTypeToUse,
      privateKey,
      keyManager,
      ['token:account', 'temporary'],
    );
    return {
      accountId: accountId,
      accountKeyRefId: imported.keyRefId,
      accountPublicKey: imported.publicKey,
    };
  }

  // Try to resolve as a name
  const aliasRecord = api.alias.resolve(account, 'account', network);
  if (!aliasRecord) {
    throw new Error(
      `Account name "${account}" not found for network ${network}. ` +
        'Please provide either a valid name or account-id:account-key pair.',
    );
  }

  // Get the account ID and key from the name
  if (!aliasRecord.entityId) {
    throw new Error(
      `Account name "${account}" does not have an associated account ID`,
    );
  }

  if (!aliasRecord.keyRefId) {
    throw new Error(
      `Account name "${account}" does not have an associated key`,
    );
  }

  // Get the public key
  const publicKey = api.kms.getPublicKey(aliasRecord.keyRefId);
  if (!publicKey) {
    throw new Error(
      `Account name "${account}" key not found in credentials state`,
    );
  }

  return {
    accountId: aliasRecord.entityId,
    accountKeyRefId: aliasRecord.keyRefId,
    accountPublicKey: publicKey,
  };
}

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
  const accountIdPattern = /^0\.0\.\d+$/;
  if (accountIdPattern.test(account)) {
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
  const tokenIdPattern = /^0\.0\.\d+$/;
  if (tokenIdPattern.test(tokenIdOrName)) {
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

type ResolvedKey = {
  publicKey: string;
  keyRefId?: string;
};

export interface ResolveKeyOptions {
  keyManager: KeyManagerName;
  tags?: string[];
}

/**
 * Parse and resolve key parameter
 * Can be:
 * - An account name (resolved via alias service)
 * - A key name (resolved via alias service)
 * - A public key already in KMS
 * - A raw private key (if options.keyManager is provided)
 *
 * @param keyOrName - Key parameter (alias, public key, or private key)
 * @param api - Core API instance
 * @param options - Optional settings for raw key import
 * @returns Resolved key information
 */
export function resolveKeyParameter(
  keyOrName: string | undefined,
  api: CoreApi,
  options?: ResolveKeyOptions,
): ResolvedKey | null {
  const network = api.network.getCurrentNetwork();

  // If a key/name is explicitly provided, try to resolve it
  if (keyOrName) {
    // Try to resolve as an account name first
    const accountAlias = api.alias.resolve(keyOrName, 'account', network);

    if (accountAlias?.keyRefId) {
      const adminPublicKey = api.kms.getPublicKey(accountAlias.keyRefId);

      if (!adminPublicKey) {
        throw new Error(
          `Found account name ${accountAlias.alias} but key not found in credentials`,
        );
      }

      return {
        keyRefId: accountAlias.keyRefId,
        publicKey: adminPublicKey,
      };
    }

    // Try to resolve as a key name
    const keyAlias = api.alias.resolve(keyOrName, 'key', network);
    if (keyAlias?.keyRefId && keyAlias.publicKey) {
      return {
        keyRefId: keyAlias.keyRefId,
        publicKey: keyAlias.publicKey,
      };
    }

    // Try to find by public key in KMS
    const publicKeyRefId = api.kms.findByPublicKey(keyOrName);
    if (publicKeyRefId) {
      return {
        keyRefId: publicKeyRefId,
        publicKey: keyOrName,
      };
    }

    // If keyManager is provided, try to import as raw private key
    if (options?.keyManager) {
      const parsed = PrivateKeyWithTypeSchema.safeParse(keyOrName);
      if (parsed.success) {
        const imported = api.kms.importPrivateKey(
          parsed.data.keyType,
          parsed.data.privateKey,
          options.keyManager,
          options.tags || [],
        );
        return {
          keyRefId: imported.keyRefId,
          publicKey: imported.publicKey,
        };
      }
    }

    throw new Error(
      `We could not resolve the provided key or name: ${keyOrName} \nor public key not found in credentials`,
    );
  }

  // Fall back to operator key (whether keyOrName was undefined or resolution failed)
  const operator = api.network.getOperator(network);
  if (operator?.keyRefId) {
    const operatorPubKey = api.kms.getPublicKey(operator.keyRefId);
    if (!operatorPubKey) {
      throw new Error('Operator key not found in credentials');
    }
    return {
      keyRefId: operator.keyRefId,
      publicKey: operatorPubKey,
    };
  }

  return null;
}
