/**
 * Test fixtures for parse-key-type tests
 * Shared test data for key parsing tests
 */

/**
 * Valid ECDSA hex key (64 hex characters = 32 bytes)
 */
export const VALID_ECDSA_HEX_KEY =
  '4cd05bfda79692efc30a8011e81b48da825a3a5eedcbdf73c3f6e341a0303978';

/**
 * Valid ECDSA DER key (starts with 30, exactly 100 hex chars after 30 = total 102)
 */
export const VALID_ECDSA_DER_KEY =
  '302e020100300506032b6570042204204cd05bfda79692efc30a8011e81b48da825a3a5eedcbdf73c3f6e341a03039784cd05bfda79692efc30a8011e81b48da825a3a5eedcbdf73c3f6e341a0303978';

/**
 * Valid Ed25519 hex key (64 hex characters = 32 bytes)
 */
export const VALID_ED25519_HEX_KEY =
  '4cd05bfda79692efc30a8011e81b48da825a3a5eedcbdf73c3f6e341a0303978';

/**
 * Valid Ed25519 DER key (starts with 30, exactly 80 hex chars after 30 = total 82)
 */
export const VALID_ED25519_DER_KEY =
  '302e020100300506032b6570042204204cd05bfda79692efc30a8011e81b48da825a3a5eedcbdf73c3f6e341a03039784cd05bfda79692efc30a8011e81b48da825a3a5eedcbdf73c3f6e341a0303978';
