import type { SolcCompiler } from '@/core/types/shared.types';

import solc from 'solc';

import { ConfigurationError } from '@/core/errors';

export function loadSolcVersion(
  version: string | undefined,
): Promise<SolcCompiler> {
  if (version) {
    return new Promise((resolve, reject) => {
      solc.loadRemoteVersion(
        version,
        (err: Error | null, solcSpecific: unknown) => {
          if (err) {
            reject(
              new ConfigurationError(
                `Problem with Solidity compiler version ${version}`,
                { cause: err },
              ),
            );
            return;
          }
          resolve(solcSpecific as SolcCompiler);
        },
      );
    });
  } else {
    return Promise.resolve(solc as unknown as SolcCompiler);
  }
}
