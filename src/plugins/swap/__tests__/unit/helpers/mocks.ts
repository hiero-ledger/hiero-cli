import {
  MOCK_ACCOUNT_ID_ALT,
  MOCK_HEDERA_ENTITY_ID_1,
  MOCK_TX_ID,
} from '@/__tests__/mocks/fixtures';
import { createMockTransaction } from '@/__tests__/mocks/hedera-sdk-mocks';
import {
  makeConfigMock,
  makeIdentityResolutionServiceMock,
  makeMirrorMock,
  makeNetworkMock,
  makeStateMock,
  makeTxExecuteMock,
  makeTxSignMock,
} from '@/__tests__/mocks/mocks';
import { SupportedNetwork } from '@/core/types/shared.types';

export const makeSwapTxExecuteMock = () =>
  makeTxExecuteMock({
    executeImpl: jest.fn().mockResolvedValue({
      success: true,
      transactionId: MOCK_TX_ID,
      receipt: { status: { status: 'SUCCESS' } },
    }),
  });

export const makeSwapTransferMock = () => ({
  buildTransferTransaction: jest.fn().mockReturnValue(createMockTransaction()),
});

export const makeSwapKeyResolverMock = () => ({
  resolveAccountCredentials: jest.fn(),
  resolveDestination: jest
    .fn()
    .mockResolvedValue({ accountId: MOCK_ACCOUNT_ID_ALT }),
});

export const makeSwapIdentityResolutionMock = () => {
  const mock = makeIdentityResolutionServiceMock();
  mock.resolveReferenceToEntityOrEvmAddress.mockReturnValue({
    entityIdOrEvmAddress: MOCK_HEDERA_ENTITY_ID_1,
  });
  return mock;
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
