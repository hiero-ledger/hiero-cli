/**
 * Unit tests for NetworkServiceImpl
 * Tests network switching, configuration, and operator management
 */
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { StateService } from '@/core/services/state/state-service.interface';

import { makeLogger, makeStateMock } from '@/__tests__/mocks/mocks';
import { DEFAULT_NETWORK } from '@/core/services/network/network.config';
import { NetworkServiceImpl } from '@/core/services/network/network-service';
import { SupportedNetwork } from '@/core/types/shared.types';

const NAMESPACE = 'network-config';
const CURRENT_KEY = 'current';
const TESTNET_OPERATOR_KEY = 'testnetOperator';
const MAINNET_OPERATOR_KEY = 'mainnetOperator';

const NETWORK_MAINNET = SupportedNetwork.MAINNET;
const NETWORK_TESTNET = SupportedNetwork.TESTNET;
const NETWORK_PREVIEWNET = SupportedNetwork.PREVIEWNET;
const NETWORK_LOCALNET = SupportedNetwork.LOCALNET;
const NETWORK_INVALID = 'invalid';
const NETWORK_UNKNOWN = 'unknown';

const ERROR_NETWORK_NOT_AVAILABLE = 'Network not available: invalid';
const ERROR_NETWORK_CONFIG_NOT_FOUND =
  'Network configuration not found: unknown';

const OPERATOR_TEST_ACCOUNT_ID = '0.0.1001';
const OPERATOR_TEST_KEY_REF_ID = 'kr_test';
const OPERATOR_MAIN_ACCOUNT_ID = '0.0.2001';
const OPERATOR_MAIN_KEY_REF_ID = 'kr_main';

describe('NetworkServiceImpl', () => {
  let networkService: NetworkServiceImpl;
  let stateMock: jest.Mocked<StateService>;
  let loggerMock: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    stateMock = makeStateMock() as jest.Mocked<StateService>;
    loggerMock = makeLogger();
    networkService = new NetworkServiceImpl(stateMock, loggerMock);
  });

  describe('getCurrentNetwork', () => {
    it('should return default network when no network is set', () => {
      stateMock.get.mockReturnValue(undefined);

      const network = networkService.getCurrentNetwork();

      expect(stateMock.get).toHaveBeenCalledWith(NAMESPACE, CURRENT_KEY);
      expect(loggerMock.debug).toHaveBeenCalledWith(
        '[NETWORK] Getting current network: undefined',
      );
      expect(network).toBe(DEFAULT_NETWORK);
    });

    it('should return stored network when set', () => {
      stateMock.get.mockReturnValue(NETWORK_MAINNET);

      const network = networkService.getCurrentNetwork();

      expect(network).toBe(NETWORK_MAINNET);
      expect(loggerMock.debug).toHaveBeenCalledWith(
        `[NETWORK] Getting current network: ${NETWORK_MAINNET}`,
      );
    });
  });

  describe('getAvailableNetworks', () => {
    it('should return list of available networks', () => {
      const networks = networkService.getAvailableNetworks();

      expect(networks).toEqual(
        expect.arrayContaining([
          NETWORK_LOCALNET,
          NETWORK_TESTNET,
          NETWORK_PREVIEWNET,
          NETWORK_MAINNET,
        ]),
      );
      expect(loggerMock.debug).toHaveBeenCalledWith(
        expect.stringContaining('[NETWORK] Getting available networks:'),
      );
    });
  });

  describe('switchNetwork', () => {
    it('should switch to available network', () => {
      stateMock.get.mockReturnValue(NETWORK_TESTNET);

      networkService.switchNetwork(NETWORK_MAINNET);

      expect(stateMock.set).toHaveBeenCalledWith(
        NAMESPACE,
        CURRENT_KEY,
        NETWORK_MAINNET,
      );
      expect(loggerMock.debug).toHaveBeenCalledWith(
        `[NETWORK] Switching network from ${NETWORK_TESTNET} to ${NETWORK_MAINNET}`,
      );
    });

    it('should throw error for unavailable network', () => {
      expect(() => networkService.switchNetwork(NETWORK_INVALID)).toThrow(
        ERROR_NETWORK_NOT_AVAILABLE,
      );
      expect(stateMock.set).not.toHaveBeenCalled();
    });
  });

  describe('getNetworkConfig', () => {
    it('should return config for testnet', () => {
      const config = networkService.getNetworkConfig(NETWORK_TESTNET);

      expect(config.name).toBe(NETWORK_TESTNET);
      expect(config.rpcUrl).toBe('https://testnet.hashio.io/api');
      expect(config.mirrorNodeUrl).toBe(
        'https://testnet.mirrornode.hedera.com/api/v1',
      );
      expect(config.chainId).toBe('0x128');
      expect(config.explorerUrl).toBe(`https://hashscan.io/${NETWORK_TESTNET}`);
      expect(config.isTestnet).toBe(true);
    });

    it('should return config for mainnet', () => {
      const config = networkService.getNetworkConfig(NETWORK_MAINNET);

      expect(config.name).toBe(NETWORK_MAINNET);
      expect(config.rpcUrl).toBe('https://mainnet.hashio.io/api');
      expect(config.mirrorNodeUrl).toBe(
        'https://mainnet.mirrornode.hedera.com/api/v1',
      );
      expect(config.chainId).toBe('0x127');
      expect(config.explorerUrl).toBe(`https://hashscan.io/${NETWORK_MAINNET}`);
      expect(config.isTestnet).toBe(false);
    });

    it('should return config for previewnet', () => {
      const config = networkService.getNetworkConfig(NETWORK_PREVIEWNET);

      expect(config.name).toBe(NETWORK_PREVIEWNET);
      expect(config.chainId).toBe('0x129');
      expect(config.isTestnet).toBe(true);
    });

    it('should return config for localnet', () => {
      const config = networkService.getNetworkConfig(NETWORK_LOCALNET);

      expect(config.name).toBe(NETWORK_LOCALNET);
      expect(config.rpcUrl).toBe('http://localhost:7546');
      expect(config.mirrorNodeUrl).toBe('http://localhost:5551/api/v1');
      expect(config.chainId).toBe('0x12a');
      expect(config.isTestnet).toBe(true);
    });

    it('should throw error for unknown network', () => {
      expect(() => networkService.getNetworkConfig(NETWORK_UNKNOWN)).toThrow(
        ERROR_NETWORK_CONFIG_NOT_FOUND,
      );
    });
  });

  describe('isNetworkAvailable', () => {
    it('should return true for available network', () => {
      const available = networkService.isNetworkAvailable(NETWORK_TESTNET);

      expect(available).toBe(true);
      expect(loggerMock.debug).toHaveBeenCalledWith(
        `[NETWORK] Checking if network is available: ${NETWORK_TESTNET} -> true`,
      );
    });

    it('should return false for unavailable network', () => {
      const available = networkService.isNetworkAvailable(NETWORK_INVALID);

      expect(available).toBe(false);
      expect(loggerMock.debug).toHaveBeenCalledWith(
        `[NETWORK] Checking if network is available: ${NETWORK_INVALID} -> false`,
      );
    });
  });

  describe('getLocalnetConfig', () => {
    it('should return localnet configuration', () => {
      const config = networkService.getLocalnetConfig();

      expect(config.localNodeAddress).toBe('127.0.0.1:50211');
      expect(config.localNodeAccountId).toBe('0.0.3');
      expect(config.localNodeMirrorAddressGRPC).toBe('127.0.0.1:5600');
      expect(loggerMock.debug).toHaveBeenCalledWith(
        '[NETWORK] Getting localnet configuration',
      );
    });
  });

  describe('setOperator', () => {
    it('should set operator for network', () => {
      const operator = {
        accountId: OPERATOR_TEST_ACCOUNT_ID,
        keyRefId: OPERATOR_TEST_KEY_REF_ID,
      };

      networkService.setOperator(NETWORK_TESTNET, operator);

      expect(stateMock.set).toHaveBeenCalledWith(
        NAMESPACE,
        TESTNET_OPERATOR_KEY,
        operator,
      );
      expect(loggerMock.debug).toHaveBeenCalledWith(
        `[NETWORK] Setting operator for network ${NETWORK_TESTNET}: ${OPERATOR_TEST_ACCOUNT_ID}`,
      );
    });

    it('should set operator for mainnet', () => {
      const operator = {
        accountId: OPERATOR_MAIN_ACCOUNT_ID,
        keyRefId: OPERATOR_MAIN_KEY_REF_ID,
      };

      networkService.setOperator(NETWORK_MAINNET, operator);

      expect(stateMock.set).toHaveBeenCalledWith(
        NAMESPACE,
        MAINNET_OPERATOR_KEY,
        operator,
      );
    });
  });

  describe('getOperator', () => {
    it('should return operator when set', () => {
      const operator = {
        accountId: OPERATOR_TEST_ACCOUNT_ID,
        keyRefId: OPERATOR_TEST_KEY_REF_ID,
      };
      stateMock.get.mockReturnValue(operator);

      const result = networkService.getOperator(NETWORK_TESTNET);

      expect(stateMock.get).toHaveBeenCalledWith(
        NAMESPACE,
        TESTNET_OPERATOR_KEY,
      );
      expect(result).toEqual(operator);
      expect(loggerMock.debug).toHaveBeenCalledWith(
        `[NETWORK] Getting operator for network ${NETWORK_TESTNET}: ${OPERATOR_TEST_ACCOUNT_ID}`,
      );
    });

    it('should return null when operator not set', () => {
      stateMock.get.mockReturnValue(undefined);

      const result = networkService.getOperator(NETWORK_TESTNET);

      expect(result).toBeNull();
      expect(loggerMock.debug).toHaveBeenCalledWith(
        `[NETWORK] Getting operator for network ${NETWORK_TESTNET}: none`,
      );
    });

    it('should return null when operator is null', () => {
      stateMock.get.mockReturnValue(null);

      const result = networkService.getOperator(NETWORK_PREVIEWNET);

      expect(result).toBeNull();
      expect(loggerMock.debug).toHaveBeenCalledWith(
        `[NETWORK] Getting operator for network ${NETWORK_PREVIEWNET}: none`,
      );
    });
  });
});
