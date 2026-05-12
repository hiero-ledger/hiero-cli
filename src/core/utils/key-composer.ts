import type { SupportedNetwork } from '@/core';

export function composeKey(network: SupportedNetwork, id: string): string {
  return `${network}:${id}`;
}
