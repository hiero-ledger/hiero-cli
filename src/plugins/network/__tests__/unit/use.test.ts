import {
  createMirrorNodeMock,
  makeArgs,
  makeLogger,
  makeNetworkMock,
  setupExitSpy,
} from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { NetworkError } from '@/core';
import {
  useNetwork as useHandler,
  UseNetworkOutputSchema,
} from '@/plugins/network/commands/use';

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
    const output = assertOutput(result.result, UseNetworkOutputSchema);
    expect(output.activeNetwork).toBe('mainnet');
  });

  test('throws when switchNetwork fails', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock('testnet');
    networkService.switchNetwork = jest.fn().mockImplementation(() => {
      throw new NetworkError('Network not available: testnet');
    });

    const args = makeArgs({ network: networkService }, logger, {
      global: 'testnet',
    });

    await expect(useHandler(args)).rejects.toThrow(
      'Network not available: testnet',
    );
  });

  test('returns output with activeNetwork when requested', async () => {
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
    const output = assertOutput(result.result, UseNetworkOutputSchema);
    expect(output.activeNetwork).toBe('previewnet');
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

    await useHandler(args);

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
    expect(
      assertOutput(res1.result, UseNetworkOutputSchema).activeNetwork,
    ).toBe('mainnet');
    expect(networkService.switchNetwork).toHaveBeenCalledWith('mainnet');

    jest.clearAllMocks();

    const argsToPreviewnet = makeArgs(
      { network: networkService, mirror: mirrorService },
      logger,
      {
        global: 'previewnet',
      },
    );

    const res2 = await useHandler(argsToPreviewnet);
    expect(
      assertOutput(res2.result, UseNetworkOutputSchema).activeNetwork,
    ).toBe('previewnet');
    expect(networkService.switchNetwork).toHaveBeenCalledWith('previewnet');
  });
});
