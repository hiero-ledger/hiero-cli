import type { ContractCompilerService } from '@/core/services/contract-compiler/contract-compiler-service.interface';
import type {
  CompilationParams,
  CompilationResult,
  SolcInput,
  SolcOutput,
} from '@/core/services/contract-compiler/types';

import * as path from 'path';

import { loadSolcVersion } from '@/core/utils/solc-loader';
import { createFindImports } from '@/core/utils/solidity-file-importer-util';

export class ContractCompilerServiceImpl implements ContractCompilerService {
  public async compileContract(
    params: CompilationParams,
  ): Promise<CompilationResult> {
    const contractBasename = path.basename(params.contractFilename);
    const solc = await loadSolcVersion(params.solidityVersion);

    const input: SolcInput = {
      language: 'Solidity',
      sources: {
        [contractBasename]: {
          content: params.contractContent,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode.object', 'metadata'],
          },
        },
      },
    };
    const findImports = createFindImports(
      path.resolve(params.basePath),
      path.dirname(params.contractFilename),
    );
    const output = JSON.parse(
      solc.compile(JSON.stringify(input), {
        import: findImports,
      }),
    ) as SolcOutput;
    if (!output.contracts && output.errors && output.errors?.length > 0) {
      throw new Error(
        `Contract ${params.contractName} compilation with error ${output.errors[0].formattedMessage}`,
      );
    }

    if (!output.contracts?.[contractBasename]?.[params.contractName]) {
      throw new Error(
        `Contract ${params.contractName} not found in compilation output`,
      );
    }

    // Solidity compiler output structure: output.contracts[filename][contractName]
    // Example: output.contracts['MyContract.sol']['MyContract'] contains the compiled contract data
    const contract = output.contracts[contractBasename][params.contractName];
    return {
      bytecode: contract.evm.bytecode.object,
      abiDefinition: contract.abi,
      metadata: contract.metadata,
    };
  }
}
