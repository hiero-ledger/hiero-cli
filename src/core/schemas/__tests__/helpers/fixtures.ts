/**
 * Test fixtures for common-schemas tests
 * Shared test data for schema validation tests
 */

/**
 * Test account ID
 */
export const TEST_ACCOUNT_ID = '0.0.123456';

/**
 * DER format private key (starts with 30, at least 100 hex characters)
 */
export const DER_KEY =
  '302e020100300506032b6570042204204cd05bfda79692efc30a8011e81b48da825a3a5eedcbdf73c3f6e341a03039784cd05bfda79692efc30a8011e81b48da825a3a5eedcbdf73c3f6e341a0303978';

/**
 * Hex format private key (128 hex characters - 64 bytes for Ed25519)
 */
export const HEX_KEY_128 =
  '4cd05bfda79692efc30a8011e81b48da825a3a5eedcbdf73c3f6e341a03039784cd05bfda79692efc30a8011e81b48da825a3a5eedcbdf73c3f6e341a0303978';

/**
 * 0x prefixed hex format key
 */
export const HEX_KEY_128_WITH_0X = `0x${HEX_KEY_128}`;

/**
 * 0x prefixed DER format key
 */
export const DER_KEY_WITH_0X = `0x${DER_KEY}`;

/**
 * Short key for testing invalid formats (too short)
 */
export const SHORT_KEY = 'abc123';

/**
 * Short DER key for testing invalid formats (too short)
 */
export const SHORT_DER_KEY = '302e02010030050603';

/**
 * Invalid key with non-hex characters
 */
export const INVALID_HEX_KEY = `${HEX_KEY_128.slice(0, 60)}xyz4`;

/**
 * Short ECDSA DER key (100 chars total = 30 + 98)
 * Real-world example that should be valid
 */
export const SHORT_ECDSA_DER_KEY =
  '3030020100300706052b8104000a04220420848eb28356c02059da137e3c3419d4b165f67d02669725f1791b029a77ea5f54';
