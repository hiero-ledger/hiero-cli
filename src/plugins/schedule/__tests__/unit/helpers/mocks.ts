import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';

import {
  makeConfigMock,
  makeKmsMock,
  makeLogger as makeGlobalLogger,
  makeNetworkMock,
  makeStateMock,
  makeTxExecuteMock,
  makeTxSignMock,
} from '@/__tests__/mocks/mocks';
import { SupportedNetwork } from '@/core/types/shared.types';

export { makeGlobalLogger as makeLogger };

export const makeScheduleArgs = (
  api: Partial<CoreApi>,
  logger: jest.Mocked<Logger>,
  args: Record<string, unknown>,
): CommandHandlerArgs => {
  const network = api.network || makeNetworkMock(SupportedNetwork.TESTNET);
  const kms = api.kms || makeKmsMock();

  const apiObject = {
    state: makeStateMock(),
    network,
    config: makeConfigMock(),
    logger,
    kms,
    txSign: makeTxSignMock(),
    txExecute: makeTxExecuteMock(),
    ...api,
  } as unknown as CoreApi;

  return {
    api: apiObject,
    logger,
    state: makeStateMock(),
    config: makeConfigMock(),
    args,
    hooks: new Map(),
  };
};
