/**
 * Test Fixtures for Config Plugin
 */
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';

export const enumOption = {
  name: ConfigOptionKey.default_key_manager,
  type: 'enum' as const,
  value: 'local',
  allowedValues: ['local', 'local_encrypted'],
};

export const booleanOption = {
  name: ConfigOptionKey.ed25519_support,
  type: 'boolean' as const,
  value: false,
};

export const listOutputFixture = {
  options: [enumOption, booleanOption],
  totalCount: 2,
};
