/**
 * Test fixtures for common-schemas tests
 * Shared test data for schema validation tests
 */

/**
 * Test account ID
 */
export const TEST_ACCOUNT_ID = '0.0.123456';

/**
 * Short key for testing invalid formats (too short)
 */
export const SHORT_KEY = 'abc123';

/**
 * Short DER key for testing invalid formats (too short)
 */
export const SHORT_DER_KEY = '302e02010030050603';

/**
 * Short ECDSA DER key (100 chars total = 30 + 98)
 * Real-world example that should be valid
 */
export const SHORT_ECDSA_DER_KEY =
  '3030020100300706052b8104000a04220420848eb28356c02059da137e3c3419d4b165f67d02669725f1791b029a77ea5f54';
