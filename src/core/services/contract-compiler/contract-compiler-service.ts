import type { ContractCompilerService } from '@/core/services/contract-compiler/contract-compiler-service.interface';
import type {
  CompilationParams,
  CompilationResult,
  SolcImportResult,
  SolcInput,
  SolcMetadata,
  SolcOutput,
} from '@/core/services/contract-compiler/types';

import * as fs from 'fs';
import * as path from 'path';
import * as solc from 'solc';

export class ContractCompilerServiceImpl implements ContractCompilerService {
  public compileContract(params: CompilationParams): CompilationResult {
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
            '*': ['evm.bytecode.object', 'metadata'],
          },
        },
      },
    };

    const output = JSON.parse(
      solc.compile(JSON.stringify(input), {
        import: this.createImportPath(params.basePath),
      }),
    ) as SolcOutput;

    const contract =
      output.contracts[params.contractFilename][params.contractName];
    const metadataOutput = JSON.parse(contract.metadata) as SolcMetadata;
    return {
      bytecode: contract.evm.bytecode.object,
      abiDefinition: metadataOutput.output.abi,
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
