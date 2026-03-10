/**
 * CSV Parser Utility for Batch Plugin
 *
 * Parses CSV files with header row into typed row objects.
 * Supports quoted fields, trimming, and validation.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface CsvParseResult<T> {
  headers: string[];
  rows: T[];
}

/**
 * Parse a single CSV line, respecting quoted fields.
 * Handles fields containing commas when wrapped in double quotes.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ("")
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Parse a CSV file into an array of row objects.
 *
 * @param filePath - Path to the CSV file (absolute or relative)
 * @param requiredHeaders - Headers that must be present in the CSV
 * @returns Parsed CSV data with headers and typed row objects
 * @throws Error if file not found, empty, or missing required headers
 */
export function parseCsvFile<T>(
  filePath: string,
  requiredHeaders: string[],
): CsvParseResult<T> {
  const resolvedPath = path.resolve(filePath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`CSV file not found: ${resolvedPath}`);
  }

  const content = fs.readFileSync(resolvedPath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  if (lines.length === 1) {
    throw new Error('CSV file contains only headers and no data rows');
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());

  // Validate required headers
  const missingHeaders = requiredHeaders.filter(
    (rh) => !headers.includes(rh.toLowerCase()),
  );
  if (missingHeaders.length > 0) {
    throw new Error(
      `CSV file is missing required headers: ${missingHeaders.join(', ')}. ` +
        `Found headers: ${headers.join(', ')}`,
    );
  }

  const rows: T[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);

    if (values.length !== headers.length) {
      throw new Error(
        `CSV row ${i} has ${values.length} fields but expected ${headers.length} (based on headers)`,
      );
    }

    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j];
    }

    rows.push(row as T);
  }

  return { headers, rows };
}
