import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

export enum DefaultContractTemplate {
  Erc20 = 'erc20',
  Erc721 = 'erc721',
}

export const DefaultTemplateSchema = z.enum(DefaultContractTemplate);

export const DEFAULT_CONSTRUCTOR_PARAMS: Record<
  DefaultContractTemplate,
  string[]
> = {
  [DefaultContractTemplate.Erc20]: ['FungibleToken', 'FTK', '1000000'],
  [DefaultContractTemplate.Erc721]: ['NonFungibleToken', 'NFTK'],
};

import { FileError } from '@/core/errors';

export const CONTRACT_NAME_REGEX = /\bcontract\s+(\w+)/;

export function resolveContractFilePath(filename: string): string {
  const hasPathSeparator = filename.includes('/') || filename.includes('\\');

  if (hasPathSeparator) {
    return filename;
  }

  return path.resolve(filename);
}

export function readContractFile(filename: string): string {
  const filepath = resolveContractFilePath(filename);
  if (!fs.existsSync(filepath)) {
    throw new FileError(`File ${filename} does not exist`, {
      context: { path: filepath },
    });
  }
  return fs.readFileSync(filepath, 'utf8');
}

export function readContractNameFromFileContent(
  contractBasename: string,
  contractFileContent: string,
): string {
  const match = contractFileContent.match(CONTRACT_NAME_REGEX);
  if (!match) {
    throw new FileError(
      `Could not resolve contract name from file: ${contractBasename}`,
      {
        context: { filename: contractBasename },
      },
    );
  }
  return match[1];
}

export function getRepositoryBasePath(): string {
  const packageEntry = require.resolve('@hiero-ledger/hiero-cli');
  const packageRoot = path.dirname(path.dirname(path.dirname(packageEntry)));
  return packageRoot;
}

export function getDefaultContractFilePath(
  template: DefaultContractTemplate,
): string {
  const packageRoot = getRepositoryBasePath();
  const filename =
    template === DefaultContractTemplate.Erc20 ? 'ERC20.sol' : 'ERC721.sol';
  return path.join(packageRoot, 'dist', 'contracts', template, filename);
}
