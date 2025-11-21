import { setOperatorHandler } from '../../commands/set-operator';
import { Status, KeyAlgorithm } from '../../../../core/shared/constants';
import {
  makeLogger,
  makeArgs,
  setupExitSpy,
  makeNetworkMock,
  makeKmsMock,
  makeAliasMock,
} from '../../../../core/shared/__tests__/helpers/mocks';

let exitSpy: jest.SpyInstance;

beforeAll(() => {
  exitSpy = setupExitSpy();
});

afterAll(() => {
  exitSpy.mockRestore();
});

describe('network plugin - set-operator command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sets operator using account-id:private-key format', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();
    const aliasService = makeAliasMock();

    const args = makeArgs(
      { network: networkService, kms: kmsService, alias: aliasService },
      logger,
      { operator: '0.0.123456:3030020100300706052b8104000a04220420...' },
    );

    const result = await setOperatorHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
    const output = JSON.parse(result.outputJson!);
    expect(output.network).toBe('testnet');
    expect(output.operator).toEqual({
      accountId: '0.0.123456',
      keyRefId: 'kr_test123',
      publicKey: 'pub-key-test',
    });
    expect(kmsService.importPrivateKey).toHaveBeenCalledWith(
      KeyAlgorithm.ECDSA,
      '3030020100300706052b8104000a04220420...',
      'local',
      ['network:operator', 'network:testnet'],
    );
    expect(networkService.setOperator).toHaveBeenCalledWith('testnet', {
      accountId: '0.0.123456',
      keyRefId: 'kr_test123',
    });
  });

  test('sets operator using alias', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();
    const aliasService = makeAliasMock();

    // Mock alias resolution
    aliasService.resolve.mockReturnValue({
      alias: 'testnet1',
      type: 'account',
      network: 'testnet',
      entityId: '0.0.789012',
      keyRefId: 'kr_alias123',
      publicKey: 'pub-key-alias',
      createdAt: '2024-01-01T00:00:00Z',
    });

    const args = makeArgs(
      { network: networkService, kms: kmsService, alias: aliasService },
      logger,
      { operator: 'testnet1' },
    );

    const result = await setOperatorHandler(args);

    expect(aliasService.resolve).toHaveBeenCalledWith(
      'testnet1',
      'account',
      'testnet',
    );
    expect(networkService.setOperator).toHaveBeenCalledWith('testnet', {
      accountId: '0.0.789012',
      keyRefId: 'kr_alias123',
    });
    expect(result.status).toBe(Status.Success);
    const output = JSON.parse(result.outputJson!);
    expect(output.network).toBe('testnet');
    expect(output.operator).toEqual({
      accountId: '0.0.789012',
      keyRefId: 'kr_alias123',
      publicKey: 'pub-key-alias',
    });
  });

  test('sets operator for specific network when --network is provided', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();
    const aliasService = makeAliasMock();

    const args = makeArgs(
      { network: networkService, kms: kmsService, alias: aliasService },
      logger,
      { operator: '0.0.123456:key', network: 'mainnet' },
    );

    const result = await setOperatorHandler(args);

    expect(networkService.setOperator).toHaveBeenCalledWith('mainnet', {
      accountId: '0.0.123456',
      keyRefId: 'kr_test123',
    });
    expect(result.status).toBe(Status.Success);
    const output = JSON.parse(result.outputJson!);
    expect(output.network).toBe('mainnet');
  });

  test('shows overwrite message when operator already exists', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();
    const aliasService = makeAliasMock();

    // Mock existing operator
    networkService.getOperator.mockReturnValue({
      accountId: '0.0.999999',
      keyRefId: 'kr_old123',
    });

    const args = makeArgs(
      { network: networkService, kms: kmsService, alias: aliasService },
      logger,
      { operator: '0.0.123456:key' },
    );

    const result = await setOperatorHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(networkService.setOperator).toHaveBeenCalledWith('testnet', {
      accountId: '0.0.123456',
      keyRefId: 'kr_test123',
    });
  });

  test('shows new operator message when no existing operator', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();
    const aliasService = makeAliasMock();

    // Mock no existing operator
    networkService.getOperator.mockReturnValue(null);

    const args = makeArgs(
      { network: networkService, kms: kmsService, alias: aliasService },
      logger,
      { operator: '0.0.123456:key' },
    );

    const result = await setOperatorHandler(args);

    expect(result.status).toBe(Status.Success);
    expect(networkService.setOperator).toHaveBeenCalledWith('testnet', {
      accountId: '0.0.123456',
      keyRefId: 'kr_test123',
    });
  });

  test('returns failure when no operator is provided', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();
    const aliasService = makeAliasMock();

    const args = makeArgs(
      { network: networkService, kms: kmsService, alias: aliasService },
      logger,
      {},
    );

    const result = await setOperatorHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBe(
      'Must specify --operator (name or account-id:private-key format)',
    );
  });

  test('returns failure when alias is not found', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();
    const aliasService = makeAliasMock();

    // Mock alias not found
    aliasService.resolve.mockReturnValue(null);

    const args = makeArgs(
      { network: networkService, kms: kmsService, alias: aliasService },
      logger,
      { operator: 'nonexistent' },
    );

    const result = await setOperatorHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      "Alias 'nonexistent' not found for network testnet",
    );
  });

  test('returns failure when alias has no key', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();
    const aliasService = makeAliasMock();

    // Mock alias with no key
    aliasService.resolve.mockReturnValue({
      alias: 'testnet1',
      type: 'account',
      network: 'testnet',
      entityId: '0.0.789012',
      keyRefId: undefined,
      publicKey: undefined,
      createdAt: '2024-01-01T00:00:00Z',
    });

    const args = makeArgs(
      { network: networkService, kms: kmsService, alias: aliasService },
      logger,
      { operator: 'testnet1' },
    );

    const result = await setOperatorHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain(
      'No key found for account 0.0.789012',
    );
  });

  test('handles KMS importPrivateKey errors', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();
    const aliasService = makeAliasMock();

    // Mock KMS error
    kmsService.importPrivateKey.mockImplementation(() => {
      throw new Error('Invalid private key format');
    });

    const args = makeArgs(
      { network: networkService, kms: kmsService, alias: aliasService },
      logger,
      { operator: 'invalid:format' },
    );

    const result = await setOperatorHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('Failed to set operator');
  });

  test('handles network service errors', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();
    const aliasService = makeAliasMock();

    // Mock network service error
    networkService.setOperator.mockImplementation(() => {
      throw new Error('Network service error');
    });

    const args = makeArgs(
      { network: networkService, kms: kmsService, alias: aliasService },
      logger,
      { operator: '0.0.123456:key' },
    );

    const result = await setOperatorHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('Failed to set operator');
  });

  test('displays all operator information after successful set', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const kmsService = makeKmsMock();
    const aliasService = makeAliasMock();

    const args = makeArgs(
      { network: networkService, kms: kmsService, alias: aliasService },
      logger,
      { operator: '0.0.123456:key' },
    );

    const result = await setOperatorHandler(args);

    expect(result.status).toBe(Status.Success);
    const output = JSON.parse(result.outputJson!);
    expect(output.network).toBe('testnet');
    expect(output.operator).toEqual({
      accountId: '0.0.123456',
      keyRefId: 'kr_test123',
      publicKey: 'pub-key-test',
    });
  });
});
