/**
 * Token File Helpers
 * Utility functions for reading and validating token definition files
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../../../core';
import { TokenFileSchema, TokenFileDefinition } from '../schema';

export function resolveTokenFilePath(filename: string): string {
  const hasPathSeparator = filename.includes('/') || filename.includes('\\');

  if (hasPathSeparator) {
    return filename;
  }

  return path.resolve(filename);
}

export async function readAndValidateTokenFile(
  filename: string,
  logger: Logger,
): Promise<TokenFileDefinition> {
  const filepath = resolveTokenFilePath(filename);
  logger.debug(`Reading token file from: ${filepath}`);

  const fileContent = await fs.readFile(filepath, 'utf-8');
  const raw = JSON.parse(fileContent) as unknown;

  const parsed = TokenFileSchema.safeParse(raw);
  if (!parsed.success) {
    logger.error('Token file validation failed');
    parsed.error.issues.forEach((issue) => {
      logger.error(`${issue.path.join('.') || '<root>'}: ${issue.message}`);
    });
    throw new Error('Invalid token definition file');
  }

  return parsed.data;
}
