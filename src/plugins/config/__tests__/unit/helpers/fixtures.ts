/**
 * Test Fixtures for Config Plugin
 */

export const enumOption = {
  name: 'default_key_manager',
  type: 'enum' as const,
  value: 'local',
  allowedValues: ['local', 'encrypted_local'],
};

export const booleanOption = {
  name: 'ed25519_support_enabled',
  type: 'boolean' as const,
  value: false,
};

export const listOutputFixture = {
  options: [enumOption, booleanOption],
  totalCount: 2,
};
