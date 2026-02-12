import type { SolcImportResult } from '@/core/services/contract-compiler/types';

import fs from 'fs';
import path from 'path';

type SoliditySourceMap = Record<string, string>;

export function createFindImports(baseDir: string, contractRoot: string) {
  const sourceMap = scanSolidityFiles(contractRoot, contractRoot);

  return function findImports(importPath: string): SolcImportResult {
    const normalized = importPath.replace(/\\/g, '/');
    if (sourceMap[normalized]) {
      return {
        contents: fs.readFileSync(sourceMap[normalized], 'utf8'),
      };
    }

    // node_modules support
    const nodePath = path.resolve(baseDir, 'node_modules', normalized);
    if (fs.existsSync(nodePath)) {
      return { contents: fs.readFileSync(nodePath, 'utf8') };
    }

    return {
      error: `Import not found: ${importPath}`,
    };
  };
}

export function scanSolidityFiles(
  dir: string,
  rootDir: string,
  map: SoliditySourceMap = {},
): SoliditySourceMap {
  try {
    for (const entry of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, entry);

      if (fs.statSync(fullPath).isDirectory()) {
        scanSolidityFiles(fullPath, rootDir, map);
      } else if (entry.endsWith('.sol')) {
        const relativePath = path
          .relative(rootDir, fullPath)
          .replace(/\\/g, '/');

        map[`./${relativePath}`] = fullPath;
        map[relativePath] = fullPath;
      }
    }

    return map;
  } catch (error) {
    throw new Error(
      `Failed to scan Solidity files under "${rootDir}": ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
