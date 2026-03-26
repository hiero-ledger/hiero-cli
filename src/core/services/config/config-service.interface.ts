/**
 * Configuration service
 * Generic accessors so new options are easy to add and discover
 */
import { KeyManager } from '@/core/services/kms/kms-types.interface';
import { LOG_LEVEL_VALUES } from '@/core/services/logger/logger-service.interface';

export const CONFIG_NAMESPACE = 'config';

/** Keys of options in CONFIG_OPTIONS — use instead of string literals when calling getOption/setOption. */
export enum ConfigOptionKey {
  ed25519_support_enabled = 'ed25519_support_enabled',
  log_level = 'log_level',
  default_key_manager = 'default_key_manager',
  skip_confirmations = 'skip_confirmations',
}

type OptionSpec =
  | {
      type: 'boolean';
      default: boolean;
    }
  | {
      type: 'number';
      default: number;
    }
  | {
      type: 'string';
      default: string;
    }
  | {
      type: 'enum';
      default: string;
      allowedValues: readonly string[];
    };

export const CONFIG_OPTIONS: Record<string, OptionSpec> = {
  ed25519_support_enabled: {
    type: 'boolean',
    default: false,
  },
  log_level: {
    type: 'enum',
    default: 'silent',
    allowedValues: LOG_LEVEL_VALUES,
  },
  default_key_manager: {
    type: 'enum',
    default: 'local',
    allowedValues: Object.values(KeyManager),
  },
  skip_confirmations: {
    type: 'boolean',
    default: false,
  },
} as const;

export const CONFIG_OPTION_TYPES = [
  'boolean',
  'number',
  'string',
  'enum',
] as const;

export type ConfigOptionType = (typeof CONFIG_OPTION_TYPES)[number];

export interface ConfigOptionDescriptor {
  name: string;
  type: ConfigOptionType;
  value: boolean | number | string;
  allowedValues?: string[]; // present when type === 'enum'
}

export interface ConfigService {
  /**
   * List all available configuration options with their current value
   */
  listOptions(): ConfigOptionDescriptor[];

  /**
   * Get a configuration option by name
   */
  getOption<T = boolean | number | string>(name: string): T;

  /**
   * Set a configuration option by name (with type validation)
   */
  setOption(name: string, value: boolean | number | string): void;
}
