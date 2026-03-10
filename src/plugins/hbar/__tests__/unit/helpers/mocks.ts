/**
 * Shared Mock Factory Functions for HBAR Transfer Tests
 * Provides reusable mocks for services, APIs, and common test utilities
 */
import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { HbarService } from '@/core/services/hbar/hbar-service.interface';
import type { StateService } from '@/core/services/state/state-service.interface';

import {
  makeAliasMock,
  makeKeyResolverMock,
  makeKmsMock,
  makeLogger,
  makeNetworkMock,
  makeStateMock,
  makeTxExecuteMock,
  makeTxSignMock,
} from '@/__tests__/mocks/mocks';

import { mockTransferTransactionResults } from './fixtures';

/**
 * Create a mocked HbarService
 */
export const makeHbarServiceMock = (
  overrides?: Partial<jest.Mocked<HbarService>>,
): jest.Mocked<HbarService> => ({
  transferTinybar: jest
    .fn()
    .mockResolvedValue(mockTransferTransactionResults.empty),
  ...overrides,
});

interface ApiMocksConfig {
  transferImpl?: jest.Mock;
  signAndExecuteImpl?: jest.Mock;
  network?: 'testnet' | 'mainnet' | 'previewnet';
}

export const makeApiMocks = (config?: ApiMocksConfig) => {
  const hbar: jest.Mocked<HbarService> = {
    transferTinybar:
      config?.transferImpl ||
      jest.fn().mockResolvedValue(mockTransferTransactionResults.empty),
  };

  const txSign = makeTxSignMock();
  const txExecute = makeTxExecuteMock({
    executeImpl: config?.signAndExecuteImpl,
  });
  const networkMock = makeNetworkMock(config?.network || 'testnet');
  const kms = makeKmsMock();
  const alias = makeAliasMock();

  return { hbar, txSign, txExecute, networkMock, kms, alias };
};

/**
 * Configuration options for setupTransferTest
 */
interface SetupTransferTestOptions {
  transferImpl?: jest.Mock;
  signAndExecuteImpl?: jest.Mock;
  defaultCredentials?: {
    accountId: string;
    privateKey: string;
    network: 'testnet' | 'mainnet' | 'previewnet';
    isDefault: boolean;
  };
}

/**
 * Setup complete test environment for transfer tests
 * Returns all necessary mocks and API objects
 */
export const setupTransferTest = (options: SetupTransferTestOptions = {}) => {
  const logger = makeLogger();
  const { hbar, txSign, txExecute, networkMock, kms, alias } = makeApiMocks({
    transferImpl: options.transferImpl,
    signAndExecuteImpl: options.signAndExecuteImpl,
  });

  const stateMock = makeStateMock();

  const api: Partial<CoreApi> = {
    hbar,
    txSign,
    txExecute,
    network: networkMock,
    kms,
    alias,
    logger,
    state: stateMock as StateService,
    keyResolver: makeKeyResolverMock({
      network: networkMock,
      alias,
      kms,
    }),
  };

  if (options.defaultCredentials && api.network) {
    (api.network.getOperator as jest.Mock).mockReturnValue(
      options.defaultCredentials,
    );
  }

  return { api, logger, hbar, txSign, txExecute, kms, alias, stateMock };
};
