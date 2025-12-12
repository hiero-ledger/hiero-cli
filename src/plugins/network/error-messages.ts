/**
 * Error messages for network commands
 * Centralized error message constants for consistent error handling
 */

export const ERROR_MESSAGES = {
  failedToSetOperator: 'Failed to set operator',
  failedToGetOperator: 'Failed to get operator',
  failedToSwitchNetwork: 'Failed to switch network',
  failedToListNetworks: 'Failed to list networks',
  noAccountAssociatedWithName:
    'No account is associated with the name provided.',
  accountMissingPrivatePublicKey:
    'The account associated with the alias does not have an associated private/public key or accountId',
  networkNotAvailable: (network: string, available: string) =>
    `Network '${network}' is not available. Available networks: ${available}`,
} as const;
