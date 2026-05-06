import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';

import {
  MOCK_ACCOUNT_ID_ALT,
  MOCK_HEDERA_ENTITY_ID_1,
  MOCK_TX_ID,
} from '@/__tests__/mocks/fixtures';
import { createMockTransaction } from '@/__tests__/mocks/hedera-sdk-mocks';
import {
  makeConfigMock,
  makeIdentityResolutionServiceMock,
  makeLogger as makeGlobalLogger,
  makeMirrorMock,
  makeNetworkMock,
  makeStateMock,
  makeTxExecuteMock,
  makeTxSignMock,
} from '@/__tests__/mocks/mocks';
import { SupportedNetwork } from '@/core/types/shared.types';

export { makeIdentityResolutionServiceMock, makeGlobalLogger as makeLogger };

export const makeArgs = (
  api: Partial<CoreApi>,
  logger: jest.Mocked<Logger>,
  args: Record<string, unknown>,
): CommandHandlerArgs => {
  const network = api.network || makeNetworkMock(SupportedNetwork.TESTNET);

  const identityResolutionDefault = makeIdentityResolutionServiceMock();
  identityResolutionDefault.resolveReferenceToEntityOrEvmAddress.mockReturnValue(
    {
      entityIdOrEvmAddress: MOCK_HEDERA_ENTITY_ID_1,
    },
  );

  const apiObject = {
    state: makeStateMock(),
    network,
    config: makeConfigMock(),
    logger,
    txSign: makeTxSignMock(),
    txExecute: makeTxExecuteMock({
      executeImpl: jest.fn().mockResolvedValue({
        success: true,
        transactionId: MOCK_TX_ID,
        receipt: { status: { status: 'SUCCESS' } },
      }),
    }),
    mirror: {
      ...makeMirrorMock(),
      getTokenInfo: jest.fn().mockResolvedValue({ decimals: '0' }),
    },
    transfer: {
      buildTransferTransaction: jest
        .fn()
        .mockReturnValue(createMockTransaction()),
    },
    keyResolver: {
      resolveAccountCredentials: jest.fn(),
      resolveDestination: jest
        .fn()
        .mockResolvedValue({ accountId: MOCK_ACCOUNT_ID_ALT }),
    },
    identityResolution: identityResolutionDefault,
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

export const makeSwapApiMocks = (
  network: SupportedNetwork = SupportedNetwork.TESTNET,
) => ({
  networkMock: makeNetworkMock(network),
  stateMock: makeStateMock(),
  configMock: makeConfigMock(),
  txSignMock: makeTxSignMock(),
  txExecuteMock: makeTxExecuteMock({
    executeImpl: jest.fn().mockResolvedValue({
      success: true,
      transactionId: MOCK_TX_ID,
      receipt: { status: { status: 'SUCCESS' } },
    }),
  }),
  mirrorMock: makeMirrorMock(),
  identityResolutionMock: makeIdentityResolutionServiceMock(),
});
