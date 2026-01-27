import type { SolcCompiler } from '@/core/types/shared.types';

import solc from 'solc';

export function loadSolcVersion(
  version: string | undefined,
): Promise<SolcCompiler> {
  if (version) {
    return new Promise((resolve, reject) => {
      solc.loadRemoteVersion(
        version,
        (err: Error | null, solcSpecific: unknown) => {
          if (err) {
            reject(err);
            throw new Error(
              `There was a problem with using Solidity compiler in version ${version}`,
              err,
            );
          }
          resolve(solcSpecific as SolcCompiler);
        },
      );
    });
  } else {
    return Promise.resolve(solc as unknown as SolcCompiler);
  }
}
