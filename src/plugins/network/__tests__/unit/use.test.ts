import { useHandler } from '../../commands/use';
import {
  makeLogger,
  makeArgs,
  setupExitSpy,
  makeNetworkMock,
} from '../../../../__tests__/mocks/mocks';
import { Status } from '../../../../core/shared/constants';

let exitSpy: jest.SpyInstance;

beforeAll(() => {
  exitSpy = setupExitSpy();
});

afterAll(() => {
  exitSpy.mockRestore();
});

describe('network plugin - use command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('switches to a valid network', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    networkService.switchNetwork = jest.fn();
    networkService.isNetworkAvailable = jest.fn().mockReturnValue(true);

    const args = makeArgs({ network: networkService }, logger, {
      network: 'mainnet',
    });

    const result = await useHandler(args);

    expect(networkService.switchNetwork).toHaveBeenCalledWith('mainnet');
    expect(result.status).toBe(Status.Success);
  });

  test('returns failure for invalid network', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    networkService.switchNetwork = jest.fn().mockImplementation(() => {
      throw new Error('Network not available: invalid');
    });

    const args = makeArgs({ network: networkService }, logger, {
      network: 'invalid',
    });

    const result = await useHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('Failed to switch network');
  });

  test('returns JSON output when requested', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    networkService.switchNetwork = jest.fn();

    const args = makeArgs({ network: networkService }, logger, {
      network: 'previewnet',
      json: true,
    });

    const result = await useHandler(args);

    expect(networkService.switchNetwork).toHaveBeenCalledWith('previewnet');
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
  });

  test('logs info message', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    networkService.switchNetwork = jest.fn();

    const args = makeArgs({ network: networkService }, logger, {
      network: 'mainnet',
    });

    const result = await useHandler(args);
    expect(result.status).toBe(Status.Success);

    expect(logger.info).toHaveBeenCalledWith('Switching to network: mainnet');
  });

  test('handles missing network argument', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');

    const args = makeArgs({ network: networkService }, logger, {});

    const result = await useHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('Network name is required');
  });

  test('successfully switches between networks', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    networkService.switchNetwork = jest.fn();

    const argsToMainnet = makeArgs({ network: networkService }, logger, {
      network: 'mainnet',
    });

    const res1 = await useHandler(argsToMainnet);
    expect(res1.status).toBe(Status.Success);

    expect(networkService.switchNetwork).toHaveBeenCalledWith('mainnet');

    jest.clearAllMocks();

    const argsToPreviewnet = makeArgs({ network: networkService }, logger, {
      network: 'previewnet',
    });

    const res2 = await useHandler(argsToPreviewnet);
    expect(res2.status).toBe(Status.Success);

    expect(networkService.switchNetwork).toHaveBeenCalledWith('previewnet');
  });
});
