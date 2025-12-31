import {
  createMirrorNodeMock,
  makeArgs,
  makeLogger,
  makeNetworkMock,
  setupExitSpy,
} from '@/__tests__/mocks/mocks';
import { Status } from '@/core/shared/constants';
import { useHandler } from '@/plugins/network/commands/use';

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
    const mirrorService = createMirrorNodeMock();

    const args = makeArgs(
      { network: networkService, mirror: mirrorService },
      logger,
      {
        global: 'mainnet',
      },
    );

    const result = await useHandler(args);

    expect(networkService.switchNetwork).toHaveBeenCalledWith('mainnet');
    expect(mirrorService.setBaseUrl).toHaveBeenCalledWith('mainnet');
    expect(result.status).toBe(Status.Success);
  });

  test('returns failure for invalid network', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    networkService.switchNetwork = jest.fn().mockImplementation(() => {
      throw new Error('Network not available: testnet');
    });

    const args = makeArgs({ network: networkService }, logger, {
      global: 'testnet',
    });

    const result = await useHandler(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toContain('Failed to switch network');
  });

  test('returns JSON output when requested', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    networkService.switchNetwork = jest.fn();
    const mirrorService = createMirrorNodeMock();

    const args = makeArgs(
      { network: networkService, mirror: mirrorService },
      logger,
      {
        global: 'previewnet',
        json: true,
      },
    );

    const result = await useHandler(args);

    expect(networkService.switchNetwork).toHaveBeenCalledWith('previewnet');
    expect(mirrorService.setBaseUrl).toHaveBeenCalledWith('previewnet');
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
  });

  test('logs info message', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    networkService.switchNetwork = jest.fn();

    const mirrorService = createMirrorNodeMock();

    const args = makeArgs(
      { network: networkService, mirror: mirrorService },
      logger,
      {
        global: 'mainnet',
      },
    );

    const result = await useHandler(args);
    expect(result.status).toBe(Status.Success);

    expect(logger.info).toHaveBeenCalledWith('Switching to network: mainnet');
  });

  test('successfully switches between networks', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    networkService.switchNetwork = jest.fn();

    const mirrorService = createMirrorNodeMock();

    const argsToMainnet = makeArgs(
      { network: networkService, mirror: mirrorService },
      logger,
      {
        global: 'mainnet',
      },
    );

    const res1 = await useHandler(argsToMainnet);
    expect(res1.status).toBe(Status.Success);

    expect(networkService.switchNetwork).toHaveBeenCalledWith('mainnet');
    expect(mirrorService.setBaseUrl).toHaveBeenCalledWith('mainnet');

    jest.clearAllMocks();

    const argsToPreviewnet = makeArgs(
      { network: networkService, mirror: mirrorService },
      logger,
      {
        global: 'previewnet',
      },
    );

    const res2 = await useHandler(argsToPreviewnet);
    expect(res2.status).toBe(Status.Success);

    expect(networkService.switchNetwork).toHaveBeenCalledWith('previewnet');
    expect(mirrorService.setBaseUrl).toHaveBeenCalledWith('previewnet');
  });
});
