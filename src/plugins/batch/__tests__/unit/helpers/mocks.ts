/**
 * Shared Mock Factory Functions for Batch Plugin Tests
 */
import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';
import type { ConfigService } from '@/core/services/config/config-service.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { StateService } from '@/core/services/state/state-service.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';

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
    getOption: jest.fn().mockReturnValue('local'),
    setOption: jest.fn(),
    ...overrides,
  }) as unknown as jest.Mocked<ConfigService>;

export const makeStateMock = (): jest.Mocked<StateService> =>
  ({
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    list: jest.fn().mockReturnValue([]),
    getNamespaces: jest.fn().mockReturnValue([]),
    getKeys: jest.fn().mockReturnValue([]),
  }) as unknown as jest.Mocked<StateService>;

export const makeApiMock = (
  overrides?: Partial<{
    config: jest.Mocked<ConfigService>;
    network: {
      getCurrentNetwork: jest.Mock;
    };
    alias: {
      resolve: jest.Mock;
    };
    keyResolver: {
      getOrInitKeyWithFallback: jest.Mock;
    };
    hbar: {
      transferTinybar: jest.Mock;
    };
    token: {
      createTransferTransaction: jest.Mock;
    };
    txExecution: {
      signAndExecuteWith: jest.Mock;
    };
    mirror: {
      getTokenInfo: jest.Mock;
    };
    state: jest.Mocked<StateService>;
  }>,
): jest.Mocked<CoreApi> =>
  ({
    config: overrides?.config || makeConfigServiceMock(),
    logger: makeLogger(),
    state: overrides?.state || makeStateMock(),
    network: overrides?.network || {
      getCurrentNetwork: jest
        .fn()
        .mockReturnValue('testnet' as SupportedNetwork),
    },
    alias: overrides?.alias || {
      resolve: jest.fn().mockReturnValue(null),
    },
    keyResolver: overrides?.keyResolver || {
      getOrInitKeyWithFallback: jest.fn().mockResolvedValue({
        accountId: '0.0.1000',
        keyRefId: 'kr_test',
        publicKey: 'test-pub-key',
      }),
    },
    hbar: overrides?.hbar || {
      transferTinybar: jest.fn().mockResolvedValue({
        transaction: {},
      }),
    },
    token: overrides?.token || {
      createTransferTransaction: jest.fn().mockReturnValue({}),
    },
    txExecution: overrides?.txExecution || {
      signAndExecuteWith: jest.fn().mockResolvedValue({
        success: true,
        transactionId: '0.0.1000@1234567890.123456789',
        receipt: { status: { status: 'SUCCESS' } },
      }),
    },
    mirror: overrides?.mirror || {
      getTokenInfo: jest.fn().mockResolvedValue({ decimals: '8' }),
    },
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
  state: params.api.state as unknown as StateService,
  config: params.api.config,
  logger: params.logger || makeLogger(),
});
