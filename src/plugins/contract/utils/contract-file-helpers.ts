/**
 * Token File Helpers
 * Utility functions for reading and validating token definition files
 */
import type { Logger } from '@/core';

import * as fs from 'fs/promises';
import * as path from 'path';

export function resolveContractFilePath(filename: string): string {
  const hasPathSeparator = filename.includes('/') || filename.includes('\\');

  if (hasPathSeparator) {
    return filename;
  }

  return path.resolve(filename);
}

export async function readContractFile(
  filename: string,
  logger: Logger,
): Promise<string> {
  const filepath = resolveContractFilePath(filename);
  logger.debug(`Reading contract file from: ${filepath}`);
  return await fs.readFile(filepath, 'utf-8');
}
