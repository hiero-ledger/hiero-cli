import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';

import {
  makeAliasMock,
  makeConfigMock,
  makeKmsMock,
  makeLogger as makeGlobalLogger,
  makeNetworkMock,
  makeStateMock,
  makeTxExecuteMock,
  makeTxSignMock,
} from '@/__tests__/mocks/mocks';
import { SupportedNetwork } from '@/core/types/shared.types';

import {
  BATCH_KEY_REF_ID,
  BATCH_PUBLIC_KEY,
  OPERATOR_ACCOUNT_ID,
  OPERATOR_KEY_REF_ID,
} from './fixtures';

export { makeGlobalLogger as makeLogger };

export const makeBatchStateHelperMock = (overrides?: {
  saveBatch?: jest.Mock;
  getBatch?: jest.Mock;
  listBatches?: jest.Mock;
  hasBatch?: jest.Mock;
  deleteBatch?: jest.Mock;
}) => ({
  saveBatch: jest.fn(),
  getBatch: jest.fn().mockReturnValue(null),
  listBatches: jest.fn().mockReturnValue([]),
  hasBatch: jest.fn().mockReturnValue(false),
  deleteBatch: jest.fn(),
  ...overrides,
});

export const makeArgs = (
  api: Partial<CoreApi>,
  logger: jest.Mocked<Logger>,
  args: Record<string, unknown>,
): CommandHandlerArgs => {
  const network = api.network || makeNetworkMock(SupportedNetwork.TESTNET);
  const kms = api.kms || makeKmsMock();
  const alias = api.alias || makeAliasMock();

  const apiObject = {
    state: makeStateMock(),
    network,
    config: makeConfigMock(),
    logger,
    alias,
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
  };
};

export const makeBatchApiMocks = (
  network: SupportedNetwork = SupportedNetwork.TESTNET,
) => {
  const networkMock = makeNetworkMock(network);
  networkMock.getOperator = jest.fn().mockReturnValue({
    accountId: OPERATOR_ACCOUNT_ID,
    keyRefId: OPERATOR_KEY_REF_ID,
  });

  const kmsMock = makeKmsMock();
  kmsMock.get = jest.fn().mockReturnValue({
    keyRefId: BATCH_KEY_REF_ID,
    publicKey: BATCH_PUBLIC_KEY,
    keyManager: 'local',
    keyAlgorithm: 'ECDSA',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  });

  const aliasMock = makeAliasMock();

  return {
    networkMock,
    kmsMock,
    aliasMock,
    stateMock: makeStateMock(),
    configMock: makeConfigMock(),
    txSignMock: makeTxSignMock(),
    txExecuteMock: makeTxExecuteMock(),
  };
};
