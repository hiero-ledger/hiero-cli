/**
 * Shared Mock Factory Functions for Config Plugin Tests
 */
import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';
import type { ConfigService } from '@/core/services/config/config-service.interface';
import type { IdentityResolutionService } from '@/core/services/identity-resolution/identity-resolution-service.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';

import { makeLogger } from '@/__tests__/mocks/mocks';

export const makeConfigServiceMock = (
  overrides?: Partial<jest.Mocked<ConfigService>>,
): jest.Mocked<ConfigService> => ({
  listOptions: jest.fn().mockReturnValue([]),
  getOption: jest.fn(),
  setOption: jest.fn(),
  setRuntimeOverride: jest.fn(),
  ...overrides,
});

export const makeApiMock = (configSvc: jest.Mocked<ConfigService>) =>
  ({
    config: configSvc,
    // minimal stubs for required CoreApi fields used by handlers
    logger: makeLogger(),
    output: {
      handleCommandOutput: jest.fn(),
      getFormat: jest.fn().mockReturnValue('human'),
      setFormat: jest.fn(),
      emptyLine: jest.fn(),
    },
    identityResolution: {
      resolveAccount: jest.fn(),
      resolveContract: jest.fn(),
    } as unknown as IdentityResolutionService,
  }) as unknown as jest.Mocked<CoreApi>;

export const makeCommandArgs = (params: {
  api: jest.Mocked<CoreApi>;
  logger?: jest.Mocked<Logger>;
  args?: Record<string, unknown>;
}): CommandHandlerArgs => ({
  args: {
    ...(params.args || {}),
  },
  api: params.api,
  hooks: new Map(),
});
