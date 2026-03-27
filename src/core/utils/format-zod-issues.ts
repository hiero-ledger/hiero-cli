import type { ZodError } from 'zod';

import { type $ZodIssue, toDotPath } from 'zod/v4/core';

export function formatZodIssueLine(issue: $ZodIssue): string {
  const path = issue.path.length === 0 ? '(root)' : toDotPath(issue.path);
  return `${path}: ${issue.message}`;
}

export function formatZodIssuesForMessage(zodError: ZodError): string {
  return zodError.issues.map((i) => `  - ${formatZodIssueLine(i)}`).join('\n');
}
