/**
 * Unit tests for localnet endpoint resolution
 * Covers the environment overrides consumed from `.env.test` and their wiring
 * into the network configuration used by the CLI and the tests
 */
import { makeLogger, makeStateMock } from '@/__tests__/mocks/mocks';
import { NetworkToBaseUrl } from '@/core/services/mirrornode/types';
import {
  DEFAULT_LOCALNET_NODE,
  DEFAULT_NETWORKS,
  LOCALNET_ENDPOINTS,
  resolveLocalnetEndpoints,
} from '@/core/services/network/network.config';
import { NetworkServiceImpl } from '@/core/services/network/network-service';
import { SupportedNetwork } from '@/core/types/shared.types';

const LOCALNET = SupportedNetwork.LOCALNET;
const DEFAULT_ENDPOINTS = {
  consensusNodeEndpoint: 'localhost:35211',
  mirrorNodeUrl: 'http://localhost:38081',
  jsonRpcRelayUrl: 'http://localhost:37546',
  explorerUrl: 'http://localhost:38080',
};

describe('resolveLocalnetEndpoints', () => {
  it('should return the solo defaults when no environment variable is set', () => {
    expect(resolveLocalnetEndpoints({})).toEqual(DEFAULT_ENDPOINTS);
  });

  it('should honour endpoint overrides from the environment', () => {
    const endpoints = resolveLocalnetEndpoints({
      CONSENSUS_NODE_ENDPOINT: 'host.docker.internal:35211',
      MIRROR_NODE_URL: 'http://host.docker.internal:38081',
      JSON_RPC_RELAY_URL: 'http://host.docker.internal:37546',
      EXPLORER_URL: 'http://host.docker.internal:38080',
    });

    expect(endpoints).toEqual({
      consensusNodeEndpoint: 'host.docker.internal:35211',
      mirrorNodeUrl: 'http://host.docker.internal:38081',
      jsonRpcRelayUrl: 'http://host.docker.internal:37546',
      explorerUrl: 'http://host.docker.internal:38080',
    });
  });

  it('should trim surrounding whitespace, drop blank overrides and normalize base URLs', () => {
    const endpoints = resolveLocalnetEndpoints({
      CONSENSUS_NODE_ENDPOINT: '   ',
      MIRROR_NODE_URL: ' http://mirror.local:38081/ ',
      JSON_RPC_RELAY_URL: '',
      EXPLORER_URL: ' http://explorer.local:38080/ ',
    });

    expect(endpoints.consensusNodeEndpoint).toBe(
      DEFAULT_ENDPOINTS.consensusNodeEndpoint,
    );
    expect(endpoints.mirrorNodeUrl).toBe('http://mirror.local:38081');
    expect(endpoints.jsonRpcRelayUrl).toBe(DEFAULT_ENDPOINTS.jsonRpcRelayUrl);
    expect(endpoints.explorerUrl).toBe('http://explorer.local:38080');
  });
});

describe('localnet endpoint wiring', () => {
  it('should build the localnet network config from the resolved endpoints', () => {
    expect(DEFAULT_NETWORKS[LOCALNET]).toEqual({
      rpcUrl: LOCALNET_ENDPOINTS.jsonRpcRelayUrl,
      mirrorNodeUrl: `${LOCALNET_ENDPOINTS.mirrorNodeUrl}/api/v1`,
    });
  });

  it('should build the localnet node address from the resolved endpoints', () => {
    expect(DEFAULT_LOCALNET_NODE.localNodeAddress).toBe(
      LOCALNET_ENDPOINTS.consensusNodeEndpoint,
    );
  });

  it('should expose the resolved endpoints through NetworkService', () => {
    const networkService = new NetworkServiceImpl(
      makeStateMock(),
      makeLogger(),
    );

    const networkConfig = networkService.getNetworkConfig(LOCALNET);
    expect(networkConfig.rpcUrl).toBe(LOCALNET_ENDPOINTS.jsonRpcRelayUrl);
    expect(networkConfig.mirrorNodeUrl).toBe(
      `${LOCALNET_ENDPOINTS.mirrorNodeUrl}/api/v1`,
    );
    expect(networkConfig.explorerUrl).toBe(
      `${LOCALNET_ENDPOINTS.explorerUrl}/${LOCALNET}`,
    );

    expect(networkService.getLocalnetConfig().localNodeAddress).toBe(
      LOCALNET_ENDPOINTS.consensusNodeEndpoint,
    );
  });

  it('should default the localnet explorer to localhost:38080/localnet', () => {
    const networkService = new NetworkServiceImpl(
      makeStateMock(),
      makeLogger(),
    );

    expect(networkService.getNetworkConfig(LOCALNET).explorerUrl).toBe(
      'http://localhost:38080/localnet',
    );
    expect(
      networkService.getNetworkConfig(SupportedNetwork.TESTNET).explorerUrl,
    ).toBe('https://hashscan.io/testnet');
  });

  it('should resolve the mirror node base URL from the resolved endpoints', () => {
    expect(NetworkToBaseUrl.get(LOCALNET)).toBe(
      LOCALNET_ENDPOINTS.mirrorNodeUrl,
    );
  });
});
