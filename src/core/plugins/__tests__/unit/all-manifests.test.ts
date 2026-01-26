import { DEFAULT_PLUGIN_STATE } from '@/core/shared/config/cli-options';
import { filterReservedOptions } from '@/core/utils/filter-reserved-options';

describe('Global Manifest Validation', () => {
  it('should ensure no built-in plugin uses reserved options', () => {
    const violations: string[] = [];

    for (const manifest of DEFAULT_PLUGIN_STATE) {
      for (const command of manifest.commands) {
        if (!command.options) continue;

        const { filteredLong, filteredShort } = filterReservedOptions(
          command.options,
        );

        if (filteredLong.length > 0) {
          violations.push(
            `Plugin "${manifest.name}", command "${command.name}" uses reserved long options: ${filteredLong.join(', ')}`,
          );
        }

        if (filteredShort.length > 0) {
          violations.push(
            `Plugin "${manifest.name}", command "${command.name}" uses reserved short options: ${filteredShort.join(', ')}`,
          );
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `Manifest Validation Failed!\n\n${violations.join('\n')}\n\n` +
          'Please change these option names/short-flags as they are reserved for global CLI use.',
      );
    }
  });
});
