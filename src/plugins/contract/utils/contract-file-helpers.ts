import * as fs from 'fs';
import * as path from 'path';

import { FileError } from '@/core/errors';

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
  const match = contractFileContent.match(/\bcontract\s+(\w+)/);
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
