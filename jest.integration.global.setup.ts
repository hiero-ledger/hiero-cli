import 'tsconfig-paths/register';

import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { deleteStateFiles } from '@/__tests__/utils/teardown';
import { createCoreApi } from '@/core';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';

// The environment is loaded by `jest.integration.config.js`: doing it here
// would be too late, since the imports above already froze `process.env` in
// `network.config`.

const parseEd25519Support = (
  value: string | undefined,
): boolean | undefined => {
  if (value === undefined || value.trim() === '') {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }
  throw new Error(
    `ED25519_SUPPORT must be "true" or "false", got "${value}" in .env.test`,
  );
};

export default async () => {
  deleteStateFiles(STATE_STORAGE_FILE_PATH);

  // The state wipe above resets every config option, so ED25519 support must be
  // restored from .env.test before the suites import an ED25519 operator key.
  const ed25519Support = parseEd25519Support(process.env.ED25519_SUPPORT);
  if (ed25519Support !== undefined) {
    const api = createCoreApi(STATE_STORAGE_FILE_PATH);
    api.config.setOption(ConfigOptionKey.ed25519_support, ed25519Support);
  }
};
