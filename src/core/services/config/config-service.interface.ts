/**
 * Configuration service
 * Generic accessors so new options are easy to add and discover
 */

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
