import {
  ECDSA_HEX_PUBLIC_KEY,
  MOCK_OPERATOR_ACCOUNT_ID,
} from '@/__tests__/mocks/fixtures';
import {
  makeAliasMock,
  makeConfigMock,
  makeKmsMock,
  makeNetworkMock,
  makeStateMock,
  makeTxExecuteMock,
  makeTxSignMock,
} from '@/__tests__/mocks/mocks';
import { KeyManager } from '@/core/services/kms/kms-types.interface';
import { KeyAlgorithm } from '@/core/shared/constants';
import { SupportedNetwork } from '@/core/types/shared.types';

import { BATCH_KEY_REF_ID, OPERATOR_KEY_REF_ID } from './fixtures';

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

export const makeBatchApiMocks = (
  network: SupportedNetwork = SupportedNetwork.TESTNET,
) => {
  const networkMock = makeNetworkMock(network);
  networkMock.getOperator = jest.fn().mockReturnValue({
    accountId: MOCK_OPERATOR_ACCOUNT_ID,
    keyRefId: OPERATOR_KEY_REF_ID,
  });

  const kmsMock = makeKmsMock();
  kmsMock.get = jest.fn().mockReturnValue({
    keyRefId: BATCH_KEY_REF_ID,
    publicKey: ECDSA_HEX_PUBLIC_KEY,
    keyManager: KeyManager.local,
    keyAlgorithm: KeyAlgorithm.ECDSA,
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
