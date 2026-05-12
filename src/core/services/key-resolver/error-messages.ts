/**
 * Error messages for key resolver service
 * Centralized error message constants for consistent error handling
 */

export const ERROR_MESSAGES = {
  credentialCannotSignNoPrivateKey: `No private key in the CLI is associated with the credential you passed.

Provide a credential that resolves to an account ID and private key pair (for example 0.0.x:your-private-key). If the account already has a private key stored in this CLI, use that account ID or alias instead.`,
  noAccountAssociatedWithName:
    'No account is associated with the name provided.',
  accountMissingPrivatePublicKey:
    'The account associated with the alias does not have an associated private/public key or accountId',
  unableToGetKeyAlgorithm:
    'Unable to get keyAlgorithm or publicKey from mirror node',
  invalidOperatorInState: 'Invalid operator in state, missing publicKey',
} as const;
