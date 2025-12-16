import type { CommandOption } from '@/core/core-api';

import { RESERVED_LONG_OPTIONS } from '@/core/shared/config/cli-options';

export function filterReservedOptions(options: CommandOption[]): {
  allowed: CommandOption[];
  filtered: string[];
} {
  const reservedNames = new Set(
    options
      .filter((option) => RESERVED_LONG_OPTIONS.has(option.name.toLowerCase()))
      .map((option) => option.name),
  );
  const allowed = options.filter((option) => !reservedNames.has(option.name));
  const filtered = Array.from(reservedNames);
  return { allowed, filtered };
}
