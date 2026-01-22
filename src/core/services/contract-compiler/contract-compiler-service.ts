import type { ContractCompilerService } from '@/core/services/contract-compiler/contract-compiler-service.interface';
import type {
  CompilationParams,
  CompilationResult,
  SolcImportResult,
  SolcInput,
  SolcMetadata,
  SolcOutput,
} from '@/core/services/contract-compiler/types';

import * as fs from 'node:fs';
import * as path from 'node:path';

import * as solc from 'solc';

export class ContractCompilerServiceImpl implements ContractCompilerService {
  compileContract(params: CompilationParams): CompilationResult {
    const input: SolcInput = {
      language: 'Solidity',
      sources: {
        [params.filename]: {
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

    const contract = output.contracts[params.filename][params.name];
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
        const fullPath = path.resolve(basePath, 'node_modules', importPath);
        const contents = fs.readFileSync(fullPath, 'utf8');
        return { contents };
      } catch {
        return { error: `File not found: ${importPath}` };
      }
    };
  }
}
