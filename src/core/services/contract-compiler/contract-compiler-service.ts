import type { ContractCompilerService } from '@/core/services/contract-compiler/contract-compiler-service.interface';
import type {
  CompilationParams,
  CompilationResult,
  SolcImportResult,
  SolcInput,
  SolcOutput,
} from '@/core/services/contract-compiler/types';

import * as fs from 'fs';
import * as path from 'path';

import { loadSolcVersion } from '@/core/utils/solc-loader';

export class ContractCompilerServiceImpl implements ContractCompilerService {
  public async compileContract(
    params: CompilationParams,
  ): Promise<CompilationResult> {
    const solc = await loadSolcVersion(params.solidityVersion);
    if (!params.contractContent.trim()) {
      throw new Error('Contract content is empty');
    }

    if (!params.contractName) {
      throw new Error('Contract name is required');
    }

    const input: SolcInput = {
      language: 'Solidity',
      sources: {
        [params.contractFilename]: {
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

    const output = JSON.parse(
      solc.compile(JSON.stringify(input), {
        import: this.createImportPath(params.basePath),
      }),
    ) as SolcOutput;

    console.dir({ output }, { depth: 3 });

    if (!output.contracts?.[params.contractFilename]?.[params.contractName]) {
      throw new Error(
        `Contract ${params.contractName} not found in compilation output`,
      );
    }

    // Solidity compiler output structure: output.contracts[filename][contractName]
    // Example: output.contracts['MyContract.sol']['MyContract'] contains the compiled contract data
    const contract =
      output.contracts[params.contractFilename][params.contractName];
    return {
      bytecode: contract.evm.bytecode.object,
      abiDefinition: contract.abi,
      metadata: contract.metadata,
    };
  }
  private createImportPath(basePath: string) {
    return function findImports(importPath: string): SolcImportResult {
      try {
        const fullPath = importPath.startsWith('@')
          ? path.resolve(basePath, 'node_modules', importPath)
          : path.resolve(basePath, importPath);
        const contents = fs.readFileSync(fullPath, 'utf8');
        return { contents };
      } catch {
        return { error: `File not found: ${importPath}` };
      }
    };
  }
}
