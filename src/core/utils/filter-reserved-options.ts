import type { CommandOption } from '@/core/core-api';

import {
  RESERVED_LONG_OPTIONS,
  RESERVED_SHORT_OPTIONS,
} from '@/core/shared/config/cli-options';

export interface FilteredOptionsResult {
  allowed: CommandOption[];
  filteredLong: string[];
  filteredShort: string[];
}

export function filterReservedOptions(
  options: CommandOption[],
): FilteredOptionsResult {
  const filteredLong: string[] = [];
  const filteredShort: string[] = [];

  const allowed = options.filter((option) => {
    const isLongReserved = RESERVED_LONG_OPTIONS.has(option.name.toLowerCase());
    const isShortReserved =
      option.short && RESERVED_SHORT_OPTIONS.has(option.short);

    if (isLongReserved) {
      filteredLong.push(option.name);
    }

    if (isShortReserved && option.short) {
      filteredShort.push(option.short);
    }

    return !isLongReserved && !isShortReserved;
  });

  return {
    allowed,
    filteredLong,
    filteredShort,
  };
}
