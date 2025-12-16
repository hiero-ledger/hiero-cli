/**
 * Common schemas for config command outputs
 */
import { z } from 'zod';

import {
  CONFIG_OPTION_TYPES,
  type ConfigOptionType,
} from '@/core/services/config/config-service.interface';

export const ConfigOptionTypeSchema = z.enum(CONFIG_OPTION_TYPES);

export const ConfigValueSchema = z.union([z.boolean(), z.number(), z.string()]);

/**
 * Infers the config option type from a descriptor type or value
 * Falls back to inferring from the value's typeof if no descriptor is available
 */
export function inferConfigOptionType(
  descriptorType: string | undefined,
  value: unknown,
): ConfigOptionType {
  const typeMap: Record<string, 'boolean' | 'number'> = {
    boolean: 'boolean',
    number: 'number',
  };
  return (
    (descriptorType as ConfigOptionType | undefined) ??
    typeMap[typeof value] ??
    'string'
  );
}
