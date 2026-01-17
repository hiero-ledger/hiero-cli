/**
 * Predefined CLI error codes for structured error handling.
 * External plugins should prefer these codes when semantics match.
 * Custom codes are allowed for domain-specific errors.
 */
export enum ErrorCode {
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  TRANSACTION_ERROR = 'TRANSACTION_ERROR',
  STATE_ERROR = 'STATE_ERROR',
  PLUGIN_ERROR = 'PLUGIN_ERROR',
  FILE_ERROR = 'FILE_ERROR',
}

// All errors exit with code 1. Scripts differentiate errors via JSON `code` field.
export const CLI_ERROR_EXIT_CODE = 1;
