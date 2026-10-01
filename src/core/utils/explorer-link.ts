/**
 * Explorer Link Utility
 * Builds the explorer URL of a network and generates clickable links to it for
 * various Hedera entity types.
 * hashscan.io is only the default domain for the Hedera public networks
 * (mainnet, testnet, previewnet): localnet uses the local explorer, whose base
 * URL comes from `LOCALNET_ENDPOINTS` (overridable through `EXPLORER_URL`).
 * Uses the universal terminal-link utility for creating links
 */
import { LOCALNET_ENDPOINTS } from '@/core/services/network/network.config';
import { HASHSCAN_BASE_URL } from '@/core/shared/constants';
import { SupportedNetwork } from '@/core/types/shared.types';

import { terminalLink } from './terminal-link';

/**
 * Explorer URL of a network: `<base>/<network>`, e.g.
 * `https://hashscan.io/testnet` or `http://localhost:38080/localnet`
 */
export const getExplorerUrl = (network: SupportedNetwork): string =>
  network === SupportedNetwork.LOCALNET
    ? `${LOCALNET_ENDPOINTS.explorerUrl}/${network}`
    : `${HASHSCAN_BASE_URL}${network}`;

export type HashscanEntityType =
  | 'token'
  | 'account'
  | 'transaction'
  | 'transactionsById'
  | 'topic'
  | 'schedule'
  | 'contract';

/**
 * Build explorer URL for a given entity
 */
function buildExplorerUrl(
  network: SupportedNetwork,
  entityType: HashscanEntityType,
  entityId: string,
): string {
  return `${getExplorerUrl(network)}/${entityType}/${entityId}`;
}

/**
 * Create a clickable terminal link to the network explorer
 * Returns plain text if terminal doesn't support hyperlinks
 */
export function createHashscanLink(
  network: SupportedNetwork,
  entityType: HashscanEntityType,
  entityId: string,
  displayText?: string,
): string {
  const url = buildExplorerUrl(network, entityType, entityId);
  const text = displayText || entityId;

  return terminalLink(text, url, { fallback: false });
}
