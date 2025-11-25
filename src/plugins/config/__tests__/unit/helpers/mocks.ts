/**
 * Shared Mock Factory Functions for Config Plugin Tests
 */
import type { Logger } from '../../../../../core/services/logger/logger-service.interface';
import type { CoreApi } from '../../../../../core/core-api/core-api.interface';
import type { ConfigService } from '../../../../../core/services/config/config-service.interface';
import type { CommandHandlerArgs } from '../../../../../core/plugins/plugin.interface';

export const makeLogger = (): jest.Mocked<Logger> => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  setLevel: jest.fn(),
});

export const makeConfigServiceMock = (
  overrides?: Partial<jest.Mocked<ConfigService>>,
): jest.Mocked<ConfigService> =>
  ({
    listOptions: jest.fn().mockReturnValue([]),
    getOption: jest.fn(),
    setOption: jest.fn(),
    ...overrides,
  }) as unknown as jest.Mocked<ConfigService>;

export const makeApiMock = (configSvc: jest.Mocked<ConfigService>) =>
  ({
    config: configSvc,
    // minimal stubs for required CoreApi fields used by handlers
    logger: makeLogger(),
    output: {
      handleCommandOutput: jest.fn(),
      getFormat: jest.fn().mockReturnValue('human'),
    },
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
  state: {} as any,
  config: params.api.config,
  logger: params.logger || makeLogger(),
});
