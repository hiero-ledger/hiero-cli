/**
 * CSV Parser Utilities
 * Parses and validates CSV files for batch operations
 */
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

import {
  AmountInputSchema,
  EntityIdSchema,
  MemoSchema,
} from '@/core/schemas/common-schemas';

/**
 * Schema for HBAR transfer row
 * Columns: to, amount, memo (optional)
 */
export const HbarTransferRowSchema = z.object({
  to: EntityIdSchema.describe('Destination account ID'),
  amount: AmountInputSchema.describe('Amount to transfer'),
  memo: MemoSchema.optional(),
});
export type HbarTransferRow = z.infer<typeof HbarTransferRowSchema>;

/**
 * Schema for token transfer row
 * Columns: to, amount, memo (optional)
 */
export const TokenTransferRowSchema = z.object({
  to: EntityIdSchema.describe('Destination account ID'),
  amount: AmountInputSchema.describe('Amount to transfer'),
  memo: MemoSchema.optional(),
});
export type TokenTransferRow = z.infer<typeof TokenTransferRowSchema>;

/**
 * Parse a line of CSV, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Read and parse a CSV file
 * Returns array of objects with column names as keys
 */
export function parseCSVFile(filePath: string): Record<string, string>[] {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  if (lines.length < 2) {
    throw new Error(
      'CSV file must contain a header row and at least one data row',
    );
  }

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};

    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || '';
    }

    rows.push(row);
  }

  return rows;
}

/**
 * Parse and validate HBAR transfer CSV
 */
export function parseHbarTransferCSV(filePath: string): {
  rows: HbarTransferRow[];
  errors: { line: number; error: string }[];
} {
  const rawRows = parseCSVFile(filePath);
  const rows: HbarTransferRow[] = [];
  const errors: { line: number; error: string }[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const lineNum = i + 2; // +2 for header and 0-indexing

    try {
      const parsed = HbarTransferRowSchema.parse(raw);
      rows.push(parsed);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const messages = err.issues
          .map(
            (issue: z.ZodIssue) => `${issue.path.join('.')}: ${issue.message}`,
          )
          .join('; ');
        errors.push({ line: lineNum, error: messages });
      } else {
        errors.push({ line: lineNum, error: String(err) });
      }
    }
  }

  return { rows, errors };
}

/**
 * Parse and validate token transfer CSV
 */
export function parseTokenTransferCSV(filePath: string): {
  rows: TokenTransferRow[];
  errors: { line: number; error: string }[];
} {
  const rawRows = parseCSVFile(filePath);
  const rows: TokenTransferRow[] = [];
  const errors: { line: number; error: string }[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const lineNum = i + 2;

    try {
      const parsed = TokenTransferRowSchema.parse(raw);
      rows.push(parsed);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const messages = err.issues
          .map(
            (issue: z.ZodIssue) => `${issue.path.join('.')}: ${issue.message}`,
          )
          .join('; ');
        errors.push({ line: lineNum, error: messages });
      } else {
        errors.push({ line: lineNum, error: String(err) });
      }
    }
  }

  return { rows, errors };
}
