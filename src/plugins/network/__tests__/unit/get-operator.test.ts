import type { KmsCredentialRecord } from '@/core/services/kms/kms-types.interface';

import {
  makeArgs,
  makeKmsMock,
  makeLogger,
  makeNetworkMock,
  setupExitSpy,
} from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { InternalError, ValidationError } from '@/core/errors';
import { KeyAlgorithm } from '@/core/shared/constants';
import {
  networkGetOperator,
  NetworkGetOperatorOutputSchema,
} from '@/plugins/network/commands/get-operator';

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

    const result = await networkGetOperator(args);

    const output = assertOutput(result.result, NetworkGetOperatorOutputSchema);
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

    const result = await networkGetOperator(args);

    const output = assertOutput(result.result, NetworkGetOperatorOutputSchema);
    expect(output.network).toBe('mainnet');
    expect(output.operator).toEqual({
      accountId: '0.0.789012',
      keyRefId: 'kr_mainnet',
      publicKey: 'pub-key-mainnet',
    });
    expect(networkService.getOperator).toHaveBeenCalledWith('mainnet');
    expect(kmsService.get).toHaveBeenCalledWith('kr_mainnet');
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

    const result = await networkGetOperator(args);

    const output = assertOutput(result.result, NetworkGetOperatorOutputSchema);
    expect(output.network).toBe('testnet');
    expect(output.operator).toBeUndefined();
    expect(networkService.getOperator).toHaveBeenCalledWith('testnet');
    expect(kmsService.get).not.toHaveBeenCalled();
  });

  test('handles missing public key gracefully', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();

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

    const result = await networkGetOperator(args);

    const output = assertOutput(result.result, NetworkGetOperatorOutputSchema);
    expect(output.network).toBe('testnet');
    expect(output.operator).toEqual({
      accountId: '0.0.123456',
      keyRefId: 'kr_test123',
      publicKey: undefined,
    });
    expect(networkService.getOperator).toHaveBeenCalledWith('testnet');
    expect(kmsService.get).toHaveBeenCalledWith('kr_test123');
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

    await expect(networkGetOperator(args)).rejects.toThrow(ValidationError);
    expect(networkService.isNetworkAvailable).toHaveBeenCalledWith('mainnet');
  });

  test('throws when network service fails', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();

    networkService.getOperator.mockImplementation(() => {
      throw new InternalError('Network service error');
    });

    const args = makeArgs(
      { network: networkService, kms: kmsService },
      logger,
      {},
    );

    await expect(networkGetOperator(args)).rejects.toThrow(
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
    kmsService.get.mockImplementation(() => {
      throw new InternalError('KMS service error');
    });

    const args = makeArgs(
      { network: networkService, kms: kmsService },
      logger,
      {},
    );

    await expect(networkGetOperator(args)).rejects.toThrow('KMS service error');
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

    const result = await networkGetOperator(args);

    const output = assertOutput(result.result, NetworkGetOperatorOutputSchema);
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

    const result = await networkGetOperator(args);

    const output = assertOutput(result.result, NetworkGetOperatorOutputSchema);
    expect(output.network).toBe('testnet');
    expect(output.operator).toEqual({
      accountId: '0.0.999999',
      keyRefId: 'kr_special',
      publicKey: 'pub-key-special',
    });
  });
});
