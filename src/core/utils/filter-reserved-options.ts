import type { HookOption, Option } from '@/core';
import type { CommandOption } from '@/core/core-api';

import {
  RESERVED_LONG_OPTIONS,
  RESERVED_SHORT_OPTIONS,
} from '@/core/shared/config/cli-options';

export interface FilteredOptionsResult {
  allowed: Option[];
  filteredLong: string[];
  filteredShort: string[];
}

export function filterReservedOptions(
  commandOptions: CommandOption[],
  hookOptions: HookOption[],
): FilteredOptionsResult {
  const combined: Option[] = [
    ...commandOptions,
    ...hookOptions.map((o) => ({ ...o, required: false })),
  ];

  const filteredLong: string[] = [];
  const filteredShort: string[] = [];

  const allowed = combined.filter((option) => {
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
