import { z } from 'zod';

import { ValidationError } from '@/core/errors';
import { SupportedNetwork } from '@/core/types/shared.types';
import { isStringifiable } from '@/core/utils/is-stringifiable';

const networkSchema = z.enum(Object.values(SupportedNetwork));

export function validateNetwork(network: unknown): SupportedNetwork | null {
  if (!network) return null;

  try {
    return networkSchema.parse(network);
  } catch {
    const validNetworks = Object.values(SupportedNetwork).join(', ');
    throw new ValidationError(
      `Network '${isStringifiable(network) ? String(network) : JSON.stringify(network)}' is not supported. Valid networks: ${validNetworks}`,
    );
  }
}
