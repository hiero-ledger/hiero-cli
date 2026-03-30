import type { z } from 'zod';

import { ValidationError } from '@/core/errors';
import {
  formatZodIssueLine,
  formatZodIssuesForMessage,
} from '@/core/utils/format-zod-issues';

export function parseWithSchema<T>(
  schema: z.ZodType<T>,
  data: unknown,
  context: string,
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issueLines = result.error.issues.map((issue) =>
      formatZodIssueLine(issue),
    );
    throw new ValidationError(
      `Invalid response (${context}):\n${formatZodIssuesForMessage(result.error)}`,
      {
        cause: result.error,
        context: { issues: issueLines },
      },
    );
  }
  return result.data;
}
