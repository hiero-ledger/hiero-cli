import type { GetOperatorOutput } from '@/plugins/network/commands/get-operator/output';

import {
  makeArgs,
  makeKmsMock,
  makeLogger,
  makeNetworkMock,
  setupExitSpy,
} from '@/__tests__/mocks/mocks';
import { ValidationError } from '@/core/errors';
import { getOperatorHandler } from '@/plugins/network/commands/get-operator';

let exitSpy: jest.SpyInstance;

beforeAll(() => {
  exitSpy = setupExitSpy();
});

afterAll(() => {
  exitSpy.mockRestore();
});

describe('network plugin - get-operator command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('gets operator for current network when no network specified', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();

    networkService.getOperator.mockReturnValue({
      accountId: '0.0.123456',
      keyRefId: 'kr_test123',
    });
    kmsService.getPublicKey.mockReturnValue('pub-key-test');

    const args = makeArgs(
      { network: networkService, kms: kmsService },
      logger,
      {},
    );

    const result = await getOperatorHandler(args);

    const output = result.result as GetOperatorOutput;
    expect(output.network).toBe('testnet');
    expect(output.operator).toEqual({
      accountId: '0.0.123456',
      keyRefId: 'kr_test123',
      publicKey: 'pub-key-test',
    });
    expect(networkService.getOperator).toHaveBeenCalledWith('testnet');
    expect(kmsService.getPublicKey).toHaveBeenCalledWith('kr_test123');
  });

  test('gets operator for specified network', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();

    networkService.getOperator.mockReturnValue({
      accountId: '0.0.789012',
      keyRefId: 'kr_mainnet',
    });
    kmsService.getPublicKey.mockReturnValue('pub-key-mainnet');

    const args = makeArgs(
      { network: networkService, kms: kmsService },
      logger,
      { network: 'mainnet' },
    );

    const result = await getOperatorHandler(args);

    const output = result.result as GetOperatorOutput;
    expect(output.network).toBe('mainnet');
    expect(output.operator).toEqual({
      accountId: '0.0.789012',
      keyRefId: 'kr_mainnet',
      publicKey: 'pub-key-mainnet',
    });
    expect(networkService.getOperator).toHaveBeenCalledWith('mainnet');
    expect(kmsService.getPublicKey).toHaveBeenCalledWith('kr_mainnet');
  });

  test('returns output without operator when no operator configured', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();

    networkService.getOperator.mockReturnValue(null);

    const args = makeArgs(
      { network: networkService, kms: kmsService },
      logger,
      {},
    );

    const result = await getOperatorHandler(args);

    const output = result.result as GetOperatorOutput;
    expect(output.network).toBe('testnet');
    expect(output.operator).toBeUndefined();
    expect(networkService.getOperator).toHaveBeenCalledWith('testnet');
    expect(kmsService.getPublicKey).not.toHaveBeenCalled();
  });

  test('handles missing public key gracefully', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();

    networkService.getOperator.mockReturnValue({
      accountId: '0.0.123456',
      keyRefId: 'kr_test123',
    });
    kmsService.getPublicKey.mockReturnValue(null);

    const args = makeArgs(
      { network: networkService, kms: kmsService },
      logger,
      {},
    );

    const result = await getOperatorHandler(args);

    const output = result.result as GetOperatorOutput;
    expect(output.network).toBe('testnet');
    expect(output.operator).toEqual({
      accountId: '0.0.123456',
      keyRefId: 'kr_test123',
      publicKey: undefined,
    });
    expect(networkService.getOperator).toHaveBeenCalledWith('testnet');
    expect(kmsService.getPublicKey).toHaveBeenCalledWith('kr_test123');
  });

  test('throws ValidationError when network is not available', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();

    networkService.isNetworkAvailable.mockReturnValue(false);
    networkService.getAvailableNetworks.mockReturnValue([
      'testnet',
      'mainnet',
      'previewnet',
    ]);

    const args = makeArgs(
      { network: networkService, kms: kmsService },
      logger,
      { network: 'mainnet' },
    );

    await expect(getOperatorHandler(args)).rejects.toThrow(ValidationError);
    expect(networkService.isNetworkAvailable).toHaveBeenCalledWith('mainnet');
  });

  test('throws when network service fails', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();

    networkService.getOperator.mockImplementation(() => {
      throw new Error('Network service error');
    });

    const args = makeArgs(
      { network: networkService, kms: kmsService },
      logger,
      {},
    );

    await expect(getOperatorHandler(args)).rejects.toThrow(
      'Network service error',
    );
  });

  test('throws when KMS service fails', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();

    networkService.getOperator.mockReturnValue({
      accountId: '0.0.123456',
      keyRefId: 'kr_test123',
    });
    kmsService.getPublicKey.mockImplementation(() => {
      throw new Error('KMS service error');
    });

    const args = makeArgs(
      { network: networkService, kms: kmsService },
      logger,
      {},
    );

    await expect(getOperatorHandler(args)).rejects.toThrow('KMS service error');
  });

  test('validates network before getting operator', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();

    networkService.isNetworkAvailable.mockReturnValue(true);
    networkService.getOperator.mockReturnValue({
      accountId: '0.0.123456',
      keyRefId: 'kr_test123',
    });
    kmsService.getPublicKey.mockReturnValue('pub-key-test');

    const args = makeArgs(
      { network: networkService, kms: kmsService },
      logger,
      { network: 'previewnet' },
    );

    const result = await getOperatorHandler(args);

    const output = result.result as GetOperatorOutput;
    expect(networkService.isNetworkAvailable).toHaveBeenCalledWith(
      'previewnet',
    );
    expect(networkService.getOperator).toHaveBeenCalledWith('previewnet');
    expect(output.network).toBe('previewnet');
  });

  test('displays all operator information when found', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();

    networkService.getOperator.mockReturnValue({
      accountId: '0.0.999999',
      keyRefId: 'kr_special',
    });
    kmsService.getPublicKey.mockReturnValue('pub-key-special');

    const args = makeArgs(
      { network: networkService, kms: kmsService },
      logger,
      {},
    );

    const result = await getOperatorHandler(args);

    const output = result.result as GetOperatorOutput;
    expect(output.network).toBe('testnet');
    expect(output.operator).toEqual({
      accountId: '0.0.999999',
      keyRefId: 'kr_special',
      publicKey: 'pub-key-special',
    });
  });
});
