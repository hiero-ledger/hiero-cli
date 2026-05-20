import {
  createMirrorNodeMock,
  makeArgs,
  makeLogger,
  makeNetworkMock,
  setupExitSpy,
} from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { NetworkError } from '@/core';
import { SupportedNetwork } from '@/core/types/shared.types';
import {
  networkUse,
  NetworkUseOutputSchema,
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
    const networkService = makeNetworkMock(SupportedNetwork.TESTNET);
    networkService.switchNetwork = jest.fn();
    networkService.isNetworkAvailable = jest.fn().mockReturnValue(true);
    const mirrorService = createMirrorNodeMock();

    const args = makeArgs(
      { network: networkService, mirror: mirrorService },
      logger,
      {
        global: SupportedNetwork.MAINNET,
      },
    );

    const result = await networkUse(args);

    expect(networkService.switchNetwork).toHaveBeenCalledWith(
      SupportedNetwork.MAINNET,
    );
    const output = assertOutput(result.result, NetworkUseOutputSchema);
    expect(output.activeNetwork).toBe(SupportedNetwork.MAINNET);
  });

  test('throws when switchNetwork fails', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock(SupportedNetwork.TESTNET);
    networkService.switchNetwork = jest.fn().mockImplementation(() => {
      throw new NetworkError('Network not available: testnet');
    });

    const args = makeArgs({ network: networkService }, logger, {
      global: SupportedNetwork.TESTNET,
    });

    await expect(networkUse(args)).rejects.toThrow(
      'Network not available: testnet',
    );
  });

  test('returns output with activeNetwork when requested', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock(SupportedNetwork.TESTNET);
    networkService.switchNetwork = jest.fn();
    const mirrorService = createMirrorNodeMock();

    const args = makeArgs(
      { network: networkService, mirror: mirrorService },
      logger,
      {
        global: SupportedNetwork.PREVIEWNET,
        json: true,
      },
    );

    const result = await networkUse(args);

    expect(networkService.switchNetwork).toHaveBeenCalledWith(
      SupportedNetwork.PREVIEWNET,
    );
    const output = assertOutput(result.result, NetworkUseOutputSchema);
    expect(output.activeNetwork).toBe(SupportedNetwork.PREVIEWNET);
  });

  test('logs info message', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock(SupportedNetwork.TESTNET);
    networkService.switchNetwork = jest.fn();

    const mirrorService = createMirrorNodeMock();

    const args = makeArgs(
      { network: networkService, mirror: mirrorService },
      logger,
      {
        global: SupportedNetwork.MAINNET,
      },
    );

    await networkUse(args);

    expect(logger.info).toHaveBeenCalledWith('Switching to network: mainnet');
  });

  test('successfully switches between networks', async () => {
    const logger = makeLogger();
    const networkService = makeNetworkMock(SupportedNetwork.TESTNET);
    networkService.switchNetwork = jest.fn();

    const mirrorService = createMirrorNodeMock();

    const argsToMainnet = makeArgs(
      { network: networkService, mirror: mirrorService },
      logger,
      {
        global: SupportedNetwork.MAINNET,
      },
    );

    const res1 = await networkUse(argsToMainnet);
    expect(
      assertOutput(res1.result, NetworkUseOutputSchema).activeNetwork,
    ).toBe(SupportedNetwork.MAINNET);
    expect(networkService.switchNetwork).toHaveBeenCalledWith(
      SupportedNetwork.MAINNET,
    );

    jest.clearAllMocks();

    const argsToPreviewnet = makeArgs(
      { network: networkService, mirror: mirrorService },
      logger,
      {
        global: SupportedNetwork.PREVIEWNET,
      },
    );

    const res2 = await networkUse(argsToPreviewnet);
    expect(
      assertOutput(res2.result, NetworkUseOutputSchema).activeNetwork,
    ).toBe(SupportedNetwork.PREVIEWNET);
    expect(networkService.switchNetwork).toHaveBeenCalledWith(
      SupportedNetwork.PREVIEWNET,
    );
  });
});
