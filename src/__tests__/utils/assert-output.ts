import type { z } from 'zod';

export function assertOutput<T>(data: unknown, schema: z.ZodType<T>): T {
  return schema.parse(data);
}
