import type { LocalnetConfig } from '@/core/services/network/network-service.interface';

import { AccountId, Client } from '@hiero-ledger/sdk';

import { ConfigurationError, SupportedNetwork } from '@/core';

export function createClient(
  network: SupportedNetwork,
  localnetConfig: LocalnetConfig,
) {
  let client: Client;
  switch (network) {
    case SupportedNetwork.MAINNET:
      client = Client.forMainnet();
      break;
    case SupportedNetwork.TESTNET:
      client = Client.forTestnet();
      break;
    case SupportedNetwork.PREVIEWNET:
      client = Client.forPreviewnet();
      break;
    case SupportedNetwork.LOCALNET: {
      const node = {
        [localnetConfig.localNodeAddress]: AccountId.fromString(
          localnetConfig.localNodeAccountId,
        ),
      };
      client = Client.forNetwork(node);

      if (localnetConfig.localNodeMirrorAddressGRPC) {
        client.setMirrorNetwork(localnetConfig.localNodeMirrorAddressGRPC);
      }
      break;
    }
    default:
      throw new ConfigurationError(`Unsupported network: ${String(network)}`);
  }
  return client;
}
