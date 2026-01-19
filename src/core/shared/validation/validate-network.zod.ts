import { z } from 'zod';

import { SupportedNetwork } from '@/core/types/shared.types';
import { formatAndExitWithError } from '@/core/utils/error-handler';
import { isStringifiable } from '@/core/utils/is-stringifiable';

const networkSchema = z.enum(Object.values(SupportedNetwork));

export function validateNetwork(network: unknown): SupportedNetwork | null {
  if (!network) return null;

  try {
    return networkSchema.parse(network);
  } catch {
    const validNetworks = Object.values(SupportedNetwork).join(', ');
    formatAndExitWithError(
      'Invalid network option',
      new Error(
        `Network '${isStringifiable(network) ? String(network) : JSON.stringify(network)}' is not supported. Valid networks: ${validNetworks}`,
      ),
    );
  }
}
