import { z } from 'zod';

/**
 * Converts Zod schema to JSON Schema with BigInt support
 *
 * BigInt is not natively representable in JSON Schema, so we:
 * 1. Use `unrepresentable: 'any'` to prevent throwing on BigInt
 * 2. Use `override` to convert BigInt fields to string with numeric pattern
 *
 * Note: `unrepresentable: 'any'` is required because bigintProcessor throws
 * BEFORE override is called. Without it, override never executes.
 */
export function zodToJsonSchema<T extends z.Schema>(schema: T) {
  return z.toJSONSchema(schema, {
    unrepresentable: 'any',
    override: (ctx) => {
      const def = ctx.zodSchema._zod?.def;
      if (def?.type === 'bigint') {
        ctx.jsonSchema.type = 'string';
        ctx.jsonSchema.pattern = '^-?[0-9]+$';
      }
    },
  });
}
