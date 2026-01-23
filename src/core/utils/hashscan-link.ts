/**
 * Hashscan Link Utility
 * Generates clickable links to Hashscan explorer for various Hedera entity types
 * Uses the universal terminal-link utility for creating links
 */
import type { SupportedNetwork } from '@/core/types/shared.types';

import { HASHSCAN_BASE_URL } from '@/core/shared/constants';

import { terminalLink } from './terminal-link';

export type HashscanEntityType =
  | 'token'
  | 'account'
  | 'transaction'
  | 'topic'
  | 'contract';

/**
 * Build Hashscan URL for a given entity
 */
export function buildHashscanUrl(
  network: SupportedNetwork,
  entityType: HashscanEntityType,
  entityId: string,
): string {
  const baseUrl = `${HASHSCAN_BASE_URL}${network}`;
  return `${baseUrl}/${entityType}/${entityId}`;
}

/**
 * Create a clickable terminal link to Hashscan
 * Returns plain text if terminal doesn't support hyperlinks
 */
export function createHashscanLink(
  network: SupportedNetwork,
  entityType: HashscanEntityType,
  entityId: string,
  displayText?: string,
): string {
  const url = buildHashscanUrl(network, entityType, entityId);
  const text = displayText || entityId;

  return terminalLink(text, url, { fallback: false });
}
