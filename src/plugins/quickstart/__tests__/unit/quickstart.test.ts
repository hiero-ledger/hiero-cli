/**
 * Quickstart Plugin Unit Tests
 */
import { Status } from '@/core/shared/constants';

import { initHandler } from '../../commands/init';
import { accountsHandler } from '../../commands/accounts';
import { verifyHandler } from '../../commands/verify';

// Mock the dependencies
const createMockArgs = (overrides: Record<string, unknown> = {}) => ({
  args: {},
  api: {
    network: {
      getCurrentNetwork: jest.fn().mockReturnValue('testnet'),
      switchNetwork: jest.fn(),
      getOperator: jest.fn().mockReturnValue({
        accountId: '0.0.12345',
        keyRefId: 'key-123',
      }),
    },
    mirror: {
      getAccountHBarBalance: jest.fn().mockResolvedValue(10_000_000_000n), // 100 HBAR
    },
    alias: {
      availableOrThrow: jest.fn(),
      register: jest.fn(),
    },
    kms: {
      createLocalPrivateKey: jest.fn().mockReturnValue({
        keyRefId: 'key-123',
        publicKey: '302a300506032b6570032100mock-public-key',
      }),
    },
    account: {
      createAccount: jest.fn().mockResolvedValue({
        transaction: { mock: 'transaction' },
        publicKey: '302a300506032b6570032100mock-public-key',
      }),
    },
    txExecution: {
      signAndExecute: jest.fn().mockResolvedValue({
        success: true,
        accountId: '0.0.54321',
        transactionId: '0.0.12345@1234567890.123456789',
        consensusTimestamp: '1234567890.123456789',
      }),
    },
    hbar: {
      transferTinybar: jest.fn().mockResolvedValue({
        transaction: { mock: 'transfer-transaction' },
      }),
    },
    config: {
      getOption: jest.fn().mockReturnValue('local'),
    },
  },
  state: {},
  config: {},
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  ...overrides,
});

describe('Quickstart Plugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('init command', () => {
    test('should initialize successfully with valid operator', async () => {
      const mockArgs = createMockArgs();

      const result = await initHandler(mockArgs as any);

      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!);
      expect(output.network).toBe('testnet');
      expect(output.networkStatus).toBe('connected');
      expect(output.operatorId).toBe('0.0.12345');
    });

    test('should fail when no operator is configured', async () => {
      const mockArgs = createMockArgs();
      mockArgs.api.network.getOperator = jest.fn().mockReturnValue(null);

      const result = await initHandler(mockArgs as any);

      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('No operator configured');
    });

    test('should switch to specified network', async () => {
      const mockArgs = createMockArgs({
        args: { network: 'previewnet' },
      });

      await initHandler(mockArgs as any);

      expect(mockArgs.api.network.switchNetwork).toHaveBeenCalled();
    });

    test('should reject invalid network', async () => {
      const mockArgs = createMockArgs({
        args: { network: 'mainnet' },
      });

      const result = await initHandler(mockArgs as any);

      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('only supports testnet and previewnet');
    });

    test('should skip verification when requested', async () => {
      const mockArgs = createMockArgs({
        args: { skipVerify: true },
      });

      const result = await initHandler(mockArgs as any);

      expect(result.status).toBe(Status.Success);
      expect(mockArgs.api.mirror.getAccountHBarBalance).not.toHaveBeenCalled();
    });
  });

  describe('accounts command', () => {
    test('should create specified number of accounts', async () => {
      const mockArgs = createMockArgs({
        args: { count: 2, balance: '5', prefix: 'dev' },
      });

      const result = await accountsHandler(mockArgs as any);

      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!);
      expect(output.count).toBe(2);
      expect(output.accounts).toHaveLength(2);
      expect(output.accounts[0].name).toBe('dev-1');
      expect(output.accounts[1].name).toBe('dev-2');
    });

    test('should fail when no operator is configured', async () => {
      const mockArgs = createMockArgs();
      mockArgs.api.network.getOperator = jest.fn().mockReturnValue(null);

      const result = await accountsHandler(mockArgs as any);

      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('No operator configured');
    });

    test('should fail when operator has insufficient balance', async () => {
      const mockArgs = createMockArgs({
        args: { count: 5, balance: '100' },
      });
      mockArgs.api.mirror.getAccountHBarBalance = jest
        .fn()
        .mockResolvedValue(100_000_000n); // 1 HBAR

      const result = await accountsHandler(mockArgs as any);

      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Insufficient operator balance');
    });

    test('should reject count less than 1', async () => {
      const mockArgs = createMockArgs({
        args: { count: 0 },
      });

      const result = await accountsHandler(mockArgs as any);

      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('at least 1');
    });
  });

  describe('verify command', () => {
    test('should pass all checks with valid configuration', async () => {
      const mockArgs = createMockArgs();

      const result = await verifyHandler(mockArgs as any);

      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!);
      expect(output.overallStatus).toBe('healthy');
      expect(output.checks.filter((c: any) => c.status === 'pass')).toHaveLength(4);
    });

    test('should report error when no operator is configured', async () => {
      const mockArgs = createMockArgs();
      mockArgs.api.network.getOperator = jest.fn().mockReturnValue(null);

      const result = await verifyHandler(mockArgs as any);

      expect(result.status).toBe(Status.Failure);

      const output = JSON.parse(result.outputJson!);
      expect(output.overallStatus).toBe('error');
      expect(output.checks.some((c: any) => c.name === 'Operator Configured' && c.status === 'fail')).toBe(true);
    });

    test('should warn on low balance', async () => {
      const mockArgs = createMockArgs();
      mockArgs.api.mirror.getAccountHBarBalance = jest
        .fn()
        .mockResolvedValue(500_000_000n); // 5 HBAR

      const result = await verifyHandler(mockArgs as any);

      expect(result.status).toBe(Status.Success);

      const output = JSON.parse(result.outputJson!);
      expect(output.overallStatus).toBe('warning');
    });

    test('should run test transfer in full mode', async () => {
      const mockArgs = createMockArgs({
        args: { full: true },
      });

      const result = await verifyHandler(mockArgs as any);

      expect(result.status).toBe(Status.Success);
      expect(mockArgs.api.hbar.transferTinybar).toHaveBeenCalled();

      const output = JSON.parse(result.outputJson!);
      expect(output.checks.some((c: any) => c.name === 'Transaction Signing' && c.status === 'pass')).toBe(true);
    });

    test('should skip test transfer when not in full mode', async () => {
      const mockArgs = createMockArgs({
        args: { full: false },
      });

      await verifyHandler(mockArgs as any);

      expect(mockArgs.api.hbar.transferTinybar).not.toHaveBeenCalled();
    });
  });
});
