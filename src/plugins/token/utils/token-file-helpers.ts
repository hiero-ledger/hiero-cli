import type { Logger } from '@/core';
import type {
  FungibleTokenFileDefinition,
  NonFungibleTokenFileDefinition,
} from '@/plugins/token/schema';

import * as fs from 'fs/promises';
import * as path from 'path';

import { FileError, ValidationError } from '@/core/errors';
import {
  FungibleTokenFileSchema,
  NonFungibleTokenFileSchema,
} from '@/plugins/token/schema';

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
): Promise<FungibleTokenFileDefinition> {
  const filepath = resolveTokenFilePath(filename);
  logger.debug(`Reading token file from: ${filepath}`);

  let raw: unknown;
  try {
    const fileContent = await fs.readFile(filepath, 'utf-8');
    raw = JSON.parse(fileContent) as unknown;
  } catch (error) {
    throw new FileError(`Cannot read token file: ${filepath}`, {
      context: { filepath },
      cause: error,
    });
  }

  const parsed = FungibleTokenFileSchema.safeParse(raw);
  if (!parsed.success) {
    logger.error('Token file validation failed');
    parsed.error.issues.forEach((issue) => {
      logger.error(`${issue.path.join('.') || '<root>'}: ${issue.message}`);
    });
    throw new ValidationError('Invalid token definition file', {
      context: { filepath },
    });
  }

  return parsed.data;
}

export async function readAndValidateNftTokenFile(
  filename: string,
  logger: Logger,
): Promise<NonFungibleTokenFileDefinition> {
  const filepath = resolveTokenFilePath(filename);
  logger.debug(`Reading NFT token file from: ${filepath}`);

  let raw: unknown;
  try {
    const fileContent = await fs.readFile(filepath, 'utf-8');
    raw = JSON.parse(fileContent) as unknown;
  } catch (error) {
    throw new FileError(`Cannot read NFT token file: ${filepath}`, {
      context: { filepath },
      cause: error,
    });
  }

  const parsed = NonFungibleTokenFileSchema.safeParse(raw);
  if (!parsed.success) {
    logger.error('NFT token file validation failed');
    parsed.error.issues.forEach((issue) => {
      logger.error(`${issue.path.join('.') || '<root>'}: ${issue.message}`);
    });
    throw new ValidationError('Invalid NFT token definition file', {
      context: { filepath },
    });
  }

  return parsed.data;
}
