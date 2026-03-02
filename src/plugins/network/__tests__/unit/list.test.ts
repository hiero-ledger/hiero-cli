import type { ListNetworksOutput } from '@/plugins/network/commands/list/output';

import {
  makeArgs,
  makeLogger,
  makeNetworkMock,
  setupExitSpy,
} from '@/__tests__/mocks/mocks';
import { listHandler } from '@/plugins/network/commands/list';
import {
  checkMirrorNodeHealth,
  checkRpcHealth,
} from '@/plugins/network/utils/networkHealth';

jest.mock('../../utils/networkHealth', () => ({
  checkMirrorNodeHealth: jest.fn(),
  checkRpcHealth: jest.fn(),
}));
const mockedCheckMirrorNodeHealth = checkMirrorNodeHealth as jest.Mock;
const mockedCheckRpcHealth = checkRpcHealth as jest.Mock;

let exitSpy: jest.SpyInstance;

beforeAll(() => {
  exitSpy = setupExitSpy();
});

afterAll(() => {
  exitSpy.mockRestore();
});

describe('network plugin - list command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCheckMirrorNodeHealth.mockResolvedValue({ status: '✅', code: 200 });
    mockedCheckRpcHealth.mockResolvedValue({ status: '✅', code: 200 });
  });

  test('lists all available networks', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const args = makeArgs({ network: networkService }, logger, {});

    const result = await listHandler(args);

    const output = result.result as ListNetworksOutput;
    expect(output.networks).toBeDefined();
    expect(output.activeNetwork).toBe('testnet');
  });

  test('shows health checks for active network', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    networkService.getNetworkConfig = jest.fn().mockImplementation((name) => ({
      name,
      rpcUrl: `https://${name}.hashio.io/api`,
      mirrorNodeUrl: `https://${name}.mirrornode.hedera.com/api/v1`,
      chainId: '0x128',
      explorerUrl: `https://hashscan.io/${name}`,
      isTestnet: name !== 'mainnet',
    }));
    const args = makeArgs({ network: networkService }, logger, {});

    await listHandler(args);

    expect(mockedCheckMirrorNodeHealth).toHaveBeenCalledWith(
      'https://testnet.mirrornode.hedera.com/api/v1',
    );
    expect(mockedCheckRpcHealth).toHaveBeenCalledWith(
      'https://testnet.hashio.io/api',
    );
  });

  test('does not show health checks for inactive networks', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const args = makeArgs({ network: networkService }, logger, {});

    await listHandler(args);

    expect(mockedCheckMirrorNodeHealth).toHaveBeenCalledTimes(1);
    expect(mockedCheckRpcHealth).toHaveBeenCalledTimes(1);
  });

  test('returns output with networks for all available networks', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('mainnet');
    networkService.getAvailableNetworks = jest
      .fn()
      .mockReturnValue(['localnet', 'testnet', 'previewnet', 'mainnet']);
    networkService.getNetworkConfig = jest.fn().mockImplementation((name) => ({
      name,
      rpcUrl: `https://${name}.hashio.io/api`,
      mirrorNodeUrl: `https://${name}.mirrornode.hedera.com/api/v1`,
      chainId: '0x127',
      explorerUrl: `https://hashscan.io/${name}`,
      isTestnet: name !== 'mainnet',
    }));
    networkService.getOperator = jest.fn().mockImplementation((name) => {
      if (name === 'mainnet') {
        return { accountId: '0.0.1001', keyRefId: 'kr_mainnet' };
      }
      return null;
    });
    const args = makeArgs({ network: networkService }, logger, { json: true });

    const result = await listHandler(args);

    const output = result.result as ListNetworksOutput;
    expect(output.networks).toHaveLength(4);
    expect(output.activeNetwork).toBe('mainnet');
  });

  test('throws when network service fails', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    networkService.getAvailableNetworks = jest.fn().mockImplementation(() => {
      throw new Error('Network service error');
    });
    const args = makeArgs({ network: networkService }, logger, {});

    await expect(listHandler(args)).rejects.toThrow('Network service error');
  });

  test('shows health check failures', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    networkService.getNetworkConfig = jest.fn().mockImplementation((name) => ({
      name,
      rpcUrl: `https://${name}.hashio.io/api`,
      mirrorNodeUrl: `https://${name}.mirrornode.hedera.com/api/v1`,
      chainId: '0x128',
      explorerUrl: `https://hashscan.io/${name}`,
      isTestnet: true,
    }));

    mockedCheckMirrorNodeHealth.mockResolvedValue({ status: '❌', code: 500 });
    mockedCheckRpcHealth.mockResolvedValue({ status: '❌' });

    const args = makeArgs({ network: networkService }, logger, {});

    const result = await listHandler(args);

    const output = result.result as ListNetworksOutput;
    expect(output.networks).toBeDefined();
  });

  test('returns success on happy path', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    const args = makeArgs({ network: networkService }, logger, {});

    const result = await listHandler(args);

    const output = result.result as ListNetworksOutput;
    expect(output.activeNetwork).toBe('testnet');
  });

  test('includes operator information in output', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    networkService.getOperator = jest.fn().mockImplementation((name) => {
      if (name === 'testnet') {
        return { accountId: '0.0.1001', keyRefId: 'kr_testnet' };
      }
      if (name === 'mainnet') {
        return { accountId: '0.0.2001', keyRefId: 'kr_mainnet' };
      }
      return null;
    });
    const args = makeArgs({ network: networkService }, logger, {});

    const result = await listHandler(args);

    const output = result.result as ListNetworksOutput;
    expect(output.networks.some((n) => n.operatorId === '0.0.1001')).toBe(true);
  });

  test('shows empty operatorId when no operator is set', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    networkService.getOperator = jest.fn().mockReturnValue(null);
    const args = makeArgs({ network: networkService }, logger, {});

    const result = await listHandler(args);

    const output = result.result as ListNetworksOutput;
    expect(output.networks.some((n) => !n.operatorId)).toBe(true);
  });
});
