import type { SupportedNetwork } from '@/core/types/shared.types';

import { z } from 'zod';

import { formatAndExitWithError } from '@/core/utils/error-handler';
import { isStringifiable } from '@/core/utils/is-stringifiable';

export const SUPPORTED_NETWORKS = [
  'mainnet',
  'testnet',
  'previewnet',
  'localnet',
] as const satisfies readonly SupportedNetwork[];

const networkSchema = z.enum(SUPPORTED_NETWORKS);

export function validateNetwork(network: unknown): SupportedNetwork | null {
  if (!network) return null;

  try {
    return networkSchema.parse(network) as SupportedNetwork;
  } catch {
    const validNetworks = SUPPORTED_NETWORKS.join(', ');
    formatAndExitWithError(
      'Invalid network option',
      new Error(
        `Network '${isStringifiable(network) ? String(network) : JSON.stringify(network)}' is not supported. Valid networks: ${validNetworks}`,
      ),
    );
  }
}
