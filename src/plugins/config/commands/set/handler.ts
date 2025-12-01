import { CommandHandlerArgs } from '../../../../core';
import { CommandExecutionResult } from '../../../../core';
import { Status } from '../../../../core/shared/constants';
import { formatError } from '../../../../core/utils/errors';
import { inferConfigOptionType } from '../../schema';
import { z } from 'zod';
import { SetConfigOutput } from './output';
import { SetConfigInputSchema } from './input';

/**
 * Zod schema to validate if a string is a valid number format
 * Uses zod's refine with Number parsing (no regex)
 * This accepts integers and decimals (e.g., "123", "-45.67", "0", "0.5")
 */
const numericStringSchema = z.string().refine(
  (s) => {
    const trimmed = s.trim();
    if (trimmed === '') return false; // reject empty
    const n = Number(trimmed);
    return !Number.isNaN(n) && isFinite(n); // true for valid finite numbers
  },
  { message: 'Must be a valid number string' },
);

/**
 * Parses a string value into boolean, number, or string.
 * - "true"/"false" (case-insensitive) → boolean
 * - Valid numeric strings (e.g., "123", "-45.67") → number
 * - Everything else → string
 */
function parseValue(input: string): boolean | number | string {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  if (lower === 'true') return true;
  if (lower === 'false') return false;

  // Use zod to validate if it's a valid numeric string
  const numericResult = numericStringSchema.safeParse(trimmed);
  if (numericResult.success) {
    return Number(trimmed);
  }

  return trimmed;
}

export async function setConfigOption(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api } = args;

  // Parse and validate arguments
  const validArgs = SetConfigInputSchema.parse(args.args);

  const name = validArgs.option;
  const rawValue = validArgs.value;

  if (!name) {
    return {
      status: Status.Failure,
      errorMessage: 'Missing required --option parameter',
    };
  }
  if (rawValue === undefined) {
    return {
      status: Status.Failure,
      errorMessage: 'Missing required --value parameter',
    };
  }

  try {
    const prev = api.config.getOption(name);
    const value = parseValue(rawValue);
    api.config.setOption(name, value);

    const descriptor = api.config.listOptions().find((o) => o.name === name);
    const type = inferConfigOptionType(descriptor?.type, value);
    const output: SetConfigOutput = {
      name,
      type,
      previousValue: prev as SetConfigOutput['previousValue'],
      newValue: value,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(output),
    };
  } catch (error) {
    return {
      status: Status.Failure,
      errorMessage: formatError(`Failed to set option "${name}"`, error),
    };
  }
}
