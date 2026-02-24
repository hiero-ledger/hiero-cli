import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

export const DEFAULT_CONTRACT_TEMPLATES = ['erc20', 'erc721'] as const;

export type DefaultContractTemplate =
  (typeof DEFAULT_CONTRACT_TEMPLATES)[number];

export const DefaultTemplateSchema = z.enum(DEFAULT_CONTRACT_TEMPLATES);

export const DEFAULT_CONSTRUCTOR_PARAMS: Record<
  DefaultContractTemplate,
  string[]
> = {
  erc20: ['FungibleToken', 'FTK', '1000000'],
  erc721: ['NonFungibleToken', 'NFTK'],
};

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
    throw new Error(`File ${filename} does not exist`);
  }
  return fs.readFileSync(filepath, 'utf8');
}

export function readContractNameFromFileContent(
  contractBasename: string,
  contractFileContent: string,
): string {
  const match = contractFileContent.match(/\bcontract\s+(\w+)/);
  if (!match) {
    throw new Error(
      `Could not resolve contract name from file: ${contractBasename} `,
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
  const filename = template === 'erc20' ? 'ERC20.sol' : 'ERC721.sol';
  return path.join(packageRoot, 'dist', 'contracts', template, filename);
}
