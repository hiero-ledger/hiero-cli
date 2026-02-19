import type { KmsCredentialRecord } from '@/core/services/kms/kms-types.interface';

import {
  makeArgs,
  makeKmsMock,
  makeLogger,
  makeNetworkMock,
  setupExitSpy,
} from '@/__tests__/mocks/mocks';
import { KeyAlgorithm, Status } from '@/core/shared/constants';
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
    const mockCredentials: KmsCredentialRecord = {
      keyRefId: 'kr_test123',
      publicKey: 'pub-key-test',
      keyAlgorithm: KeyAlgorithm.ECDSA,
      keyManager: 'local',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();

    // Mock existing operator
    networkService.getOperator.mockReturnValue({
      accountId: '0.0.123456',
      keyRefId: 'kr_test123',
    });
    kmsService.get.mockReturnValue(mockCredentials);

    const args = makeArgs(
      { network: networkService, kms: kmsService },
      logger,
      {},
    );

    const result = await getOperatorHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
    const output = JSON.parse(result.outputJson!);
    expect(output.network).toBe('testnet');
    expect(output.operator).toEqual({
      accountId: '0.0.123456',
      keyRefId: 'kr_test123',
      publicKey: 'pub-key-test',
    });
    expect(networkService.getOperator).toHaveBeenCalledWith('testnet');
    expect(kmsService.get).toHaveBeenCalledWith('kr_test123');
  });

  test('gets operator for specified network', async () => {
    const mockCredentials: KmsCredentialRecord = {
      keyRefId: 'kr_mainnet',
      publicKey: 'pub-key-mainnet',
      keyAlgorithm: KeyAlgorithm.ECDSA,
      keyManager: 'local',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();

    // Mock existing operator
    networkService.getOperator.mockReturnValue({
      accountId: '0.0.789012',
      keyRefId: 'kr_mainnet',
    });
    kmsService.get.mockReturnValue(mockCredentials);

    const args = makeArgs(
      { network: networkService, kms: kmsService },
      logger,
      { network: 'mainnet' },
    );

    const result = await getOperatorHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
    const output = JSON.parse(result.outputJson!);
    expect(output.network).toBe('mainnet');
    expect(output.operator).toEqual({
      accountId: '0.0.789012',
      keyRefId: 'kr_mainnet',
      publicKey: 'pub-key-mainnet',
    });
    expect(networkService.getOperator).toHaveBeenCalledWith('mainnet');
    expect(kmsService.get).toHaveBeenCalledWith('kr_mainnet');
  });

  test('shows warning when no operator is configured', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();

    // Mock no operator
    networkService.getOperator.mockReturnValue(null);

    const args = makeArgs(
      { network: networkService, kms: kmsService },
      logger,
      {},
    );

    const result = await getOperatorHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
    const output = JSON.parse(result.outputJson!);
    expect(output.network).toBe('testnet');
    expect(output.operator).toBeUndefined();
    expect(networkService.getOperator).toHaveBeenCalledWith('testnet');
    expect(kmsService.get).not.toHaveBeenCalled();
  });

  test('handles missing public key gracefully', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();

    // Mock operator but no public key
    networkService.getOperator.mockReturnValue({
      accountId: '0.0.123456',
      keyRefId: 'kr_test123',
    });
    kmsService.get.mockReturnValue(undefined);

    const args = makeArgs(
      { network: networkService, kms: kmsService },
      logger,
      {},
    );

    const result = await getOperatorHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
    const output = JSON.parse(result.outputJson!);
    expect(output.network).toBe('testnet');
    expect(output.operator).toEqual({
      accountId: '0.0.123456',
      keyRefId: 'kr_test123',
      publicKey: undefined,
    });
    expect(networkService.getOperator).toHaveBeenCalledWith('testnet');
    expect(kmsService.get).toHaveBeenCalledWith('kr_test123');
  });

  test('returns failure when network is not available', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();

    // Mock network not available
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

    const result = await getOperatorHandler(args);

    expect(networkService.isNetworkAvailable).toHaveBeenCalledWith('mainnet');
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain("Network 'mainnet' is not available");
  });

  test('handles network service errors', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();

    // Mock network service error
    networkService.getOperator.mockImplementation(() => {
      throw new Error('Network service error');
    });

    const args = makeArgs(
      { network: networkService, kms: kmsService },
      logger,
      {},
    );

    const result = await getOperatorHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('Failed to get operator');
  });

  test('handles KMS service errors', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();

    // Mock operator but KMS error
    networkService.getOperator.mockReturnValue({
      accountId: '0.0.123456',
      keyRefId: 'kr_test123',
    });
    kmsService.get.mockImplementation(() => {
      throw new Error('KMS service error');
    });

    const args = makeArgs(
      { network: networkService, kms: kmsService },
      logger,
      {},
    );

    const result = await getOperatorHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('Failed to get operator');
  });

  test('validates network before getting operator', async () => {
    const mockCredentials: KmsCredentialRecord = {
      keyRefId: 'kr_testnet',
      publicKey: 'pub-key-test',
      keyAlgorithm: KeyAlgorithm.ECDSA,
      keyManager: 'local',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();

    // Mock network validation
    networkService.isNetworkAvailable.mockReturnValue(true);
    networkService.getOperator.mockReturnValue({
      accountId: '0.0.123456',
      keyRefId: 'kr_test123',
    });
    kmsService.get.mockReturnValue(mockCredentials);

    const args = makeArgs(
      { network: networkService, kms: kmsService },
      logger,
      { network: 'previewnet' },
    );

    const result = await getOperatorHandler(args);

    expect(result.status).toBe(Status.Success);
    const output = JSON.parse(result.outputJson!);
    expect(networkService.isNetworkAvailable).toHaveBeenCalledWith(
      'previewnet',
    );
    expect(networkService.getOperator).toHaveBeenCalledWith('previewnet');
    expect(output.network).toBe('previewnet');
  });

  test('displays all operator information when found', async () => {
    const mockCredentials: KmsCredentialRecord = {
      keyRefId: 'kr_special',
      publicKey: 'pub-key-special',
      keyAlgorithm: KeyAlgorithm.ECDSA,
      keyManager: 'local',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();

    // Mock operator with all info
    networkService.getOperator.mockReturnValue({
      accountId: '0.0.999999',
      keyRefId: 'kr_special',
    });
    kmsService.get.mockReturnValue(mockCredentials);

    const args = makeArgs(
      { network: networkService, kms: kmsService },
      logger,
      {},
    );

    const result = await getOperatorHandler(args);

    expect(result.status).toBe(Status.Success);
    const output = JSON.parse(result.outputJson!);
    expect(output.network).toBe('testnet');
    expect(output.operator).toEqual({
      accountId: '0.0.999999',
      keyRefId: 'kr_special',
      publicKey: 'pub-key-special',
    });
  });
});
