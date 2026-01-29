import type { CommandOption } from '@/core/core-api';

import { OptionType } from '@/core/types/shared.types';
import { filterReservedOptions } from '@/core/utils/filter-reserved-options';

describe('filterReservedOptions', () => {
  it('should allow non-reserved options', () => {
    const options: CommandOption[] = [
      {
        name: 'my-option',
        type: OptionType.STRING,
        required: false,
        short: 'm',
      },
    ];
    const result = filterReservedOptions(options);
    expect(result.allowed).toHaveLength(1);
    expect(result.allowed[0].name).toBe('my-option');
    expect(result.filteredLong).toHaveLength(0);
    expect(result.filteredShort).toHaveLength(0);
  });

  it('should filter reserved long options', () => {
    const options: CommandOption[] = [
      { name: 'network', type: OptionType.STRING, required: false },
      { name: 'format', type: OptionType.STRING, required: false },
      { name: 'valid', type: OptionType.STRING, required: false },
    ];
    const result = filterReservedOptions(options);
    expect(result.allowed).toHaveLength(1);
    expect(result.allowed[0].name).toBe('valid');
    expect(result.filteredLong).toContain('network');
    expect(result.filteredLong).toContain('format');
  });

  it('should filter reserved short options', () => {
    const options: CommandOption[] = [
      { name: 'my-n', short: 'N', type: OptionType.STRING, required: false },
      { name: 'my-h', short: 'h', type: OptionType.STRING, required: false },
      { name: 'valid', short: 'v', type: OptionType.STRING, required: false },
    ];
    const result = filterReservedOptions(options);
    expect(result.allowed).toHaveLength(1);
    expect(result.allowed[0].name).toBe('valid');
    expect(result.filteredShort).toContain('N');
    expect(result.filteredShort).toContain('h');
  });

  it('should filter both long and short reserved options', () => {
    const options: CommandOption[] = [
      { name: 'network', short: 'N', type: OptionType.STRING, required: false },
      { name: 'format', short: 'f', type: OptionType.STRING, required: false },
      { name: 'custom', short: 'h', type: OptionType.STRING, required: false },
    ];
    const result = filterReservedOptions(options);
    expect(result.allowed).toHaveLength(0);
    expect(result.filteredLong).toContain('network');
    expect(result.filteredLong).toContain('format');
    expect(result.filteredShort).toContain('N');
    expect(result.filteredShort).toContain('h');
  });

  it('should be case-insensitive for long names but case-sensitive for short names', () => {
    const options: CommandOption[] = [
      { name: 'NETWORK', type: OptionType.STRING, required: false },
      {
        name: 'valid',
        short: 'n',
        type: OptionType.STRING,
        required: false,
      }, // lowercase 'n' is not reserved, 'N' is
    ];
    const result = filterReservedOptions(options);
    expect(result.allowed).toHaveLength(1);
    expect(result.allowed[0].short).toBe('n');
    expect(result.filteredLong).toContain('NETWORK');
    expect(result.filteredShort).not.toContain('n');
  });
});
