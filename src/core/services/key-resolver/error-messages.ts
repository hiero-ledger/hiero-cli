/**
 * Error messages for key resolver service
 * Centralized error message constants for consistent error handling
 */

export const ERROR_MESSAGES = {
  noAccountAssociatedWithName:
    'No account is associated with the name provided.',
  accountMissingPrivatePublicKey:
    'The account associated with the alias does not have an associated private/public key or accountId',
  unableToGetKeyAlgorithm:
    'Unable to get keyAlgorithm or publicKey from mirror node',
  invalidOperatorInState: 'Invalid operator in state, missing publicKey',
} as const;
