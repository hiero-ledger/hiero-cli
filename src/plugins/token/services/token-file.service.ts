import type { Logger } from '@/core';
import type {
  FungibleTokenFileDefinition,
  NonFungibleTokenFileDefinition,
} from '@/plugins/token/schema';
import type { TokenFileService } from '@/plugins/token/services/token-file.service.interface';

import * as fs from 'fs/promises';

import { FileError, ValidationError } from '@/core/errors';
import {
  FungibleTokenFileSchema,
  NonFungibleTokenFileSchema,
} from '@/plugins/token/schema';
import { resolveTokenFilePath } from '@/plugins/token/utils/token-file-helpers';

export class TokenFileServiceImpl implements TokenFileService {
  constructor(private readonly logger: Logger) {}

  async readAndValidateTokenFile(
    filename: string,
  ): Promise<FungibleTokenFileDefinition> {
    const filepath = resolveTokenFilePath(filename);
    this.logger.debug(`Reading token file from: ${filepath}`);

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
      this.logger.error('Token file validation failed');
      parsed.error.issues.forEach((issue) => {
        this.logger.error(
          `${issue.path.join('.') || '<root>'}: ${issue.message}`,
        );
      });
      throw new ValidationError('Invalid token definition file', {
        context: { filepath },
      });
    }

    return parsed.data;
  }

  async readAndValidateNftTokenFile(
    filename: string,
  ): Promise<NonFungibleTokenFileDefinition> {
    const filepath = resolveTokenFilePath(filename);
    this.logger.debug(`Reading NFT token file from: ${filepath}`);

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
      this.logger.error('NFT token file validation failed');
      parsed.error.issues.forEach((issue) => {
        this.logger.error(
          `${issue.path.join('.') || '<root>'}: ${issue.message}`,
        );
      });
      throw new ValidationError('Invalid NFT token definition file', {
        context: { filepath },
      });
    }

    return parsed.data;
  }
}
