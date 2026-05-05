/**
 * Shared Mock Factory Functions for HBAR Transfer Tests
 * Provides reusable mocks for services, APIs, and common test utilities
 */
import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { AllowanceService } from '@/core/services/allowance/allowance-service.interface';
import type { StateService } from '@/core/services/state/state-service.interface';
import type { TransferService } from '@/core/services/transfer/transfer-service.interface';

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
 * Create a mocked TransferService
 */
export const makeTransferServiceMock = (
  overrides?: Partial<jest.Mocked<TransferService>>,
): jest.Mocked<TransferService> => ({
  buildTransferTransaction: jest
    .fn()
    .mockReturnValue(mockTransferTransactionResults.empty.transaction),
  ...overrides,
});

/**
 * Create a mocked AllowanceService
 */
export const makeAllowanceServiceMock = (
  overrides?: Partial<jest.Mocked<AllowanceService>>,
): jest.Mocked<AllowanceService> => ({
  buildAllowanceApprove: jest.fn(),
  buildNftAllowanceDelete: jest.fn(),
  ...overrides,
});

interface ApiMocksConfig {
  transferImpl?: jest.Mock;
  signAndExecuteImpl?: jest.Mock;
  network?: 'testnet' | 'mainnet' | 'previewnet';
}

export const makeApiMocks = (config?: ApiMocksConfig) => {
  const transfer: jest.Mocked<TransferService> = {
    buildTransferTransaction:
      config?.transferImpl ||
      jest
        .fn()
        .mockReturnValue(mockTransferTransactionResults.empty.transaction),
  };

  const allowance: jest.Mocked<AllowanceService> = {
    buildAllowanceApprove: jest.fn(),
    buildNftAllowanceDelete: jest.fn(),
  };

  const txSign = makeTxSignMock();
  const txExecute = makeTxExecuteMock({
    executeImpl: config?.signAndExecuteImpl,
  });
  const networkMock = makeNetworkMock(config?.network || 'testnet');
  const kms = makeKmsMock();
  const alias = makeAliasMock();

  return { transfer, allowance, txSign, txExecute, networkMock, kms, alias };
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
  const { transfer, allowance, txSign, txExecute, networkMock, kms, alias } =
    makeApiMocks({
      transferImpl: options.transferImpl,
      signAndExecuteImpl: options.signAndExecuteImpl,
    });

  const stateMock = makeStateMock();

  const api: Partial<CoreApi> = {
    transfer,
    allowance,
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

  return {
    api,
    logger,
    transfer,
    allowance,
    txSign,
    txExecute,
    kms,
    alias,
    stateMock,
  };
};
