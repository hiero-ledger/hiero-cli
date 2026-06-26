import {
  DEFAULT_PLUGIN_STATE,
  RESERVED_LONG_OPTIONS,
  RESERVED_SHORT_OPTIONS,
} from '@/core/shared/config/cli-options';

/**
 * Guards the CLI against startup-time ConfigurationErrors: no plugin command
 * may declare an option whose short/long flag is reserved by the core CLI.
 * In particular this protects the global -M/--max-transaction-fee flag.
 */
describe('reserved CLI options', () => {
  const collisions: string[] = [];

  for (const manifest of DEFAULT_PLUGIN_STATE) {
    for (const command of manifest.commands ?? []) {
      for (const option of command.options ?? []) {
        if (option.short && RESERVED_SHORT_OPTIONS.has(String(option.short))) {
          collisions.push(
            `${manifest.name} ${command.name} --${String(option.name)} (-${String(option.short)})`,
          );
        }
        if (RESERVED_LONG_OPTIONS.has(String(option.name).toLowerCase())) {
          collisions.push(
            `${manifest.name} ${command.name} --${String(option.name)}`,
          );
        }
      }
    }
  }

  it('reserves the max-transaction-fee flags', () => {
    expect(RESERVED_SHORT_OPTIONS.has('M')).toBe(true);
    expect(RESERVED_LONG_OPTIONS.has('max-transaction-fee')).toBe(true);
  });

  it('has no plugin command colliding with a reserved option', () => {
    expect(collisions).toEqual([]);
  });
});
