/**
 * Unit tests for ContractCompilerServiceImpl
 * Tests Solidity contract compilation and import resolution
 */
import type { CompilationParams } from '@/core/services/contract-compiler/types';

import * as fs from 'fs';
import * as path from 'path';
import * as solc from 'solc';

import { ContractCompilerServiceImpl } from '@/core/services/contract-compiler/contract-compiler-service';

jest.mock('solc', () => ({
  compile: jest.fn(),
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

jest.mock('path', () => ({
  resolve: jest.fn((...segments: string[]) => segments.join('/')),
}));

const mockCompile = solc.compile as jest.Mock;
const mockReadFileSync = fs.readFileSync as jest.Mock;
const mockPathResolve = path.resolve as jest.Mock;

describe('ContractCompilerServiceImpl', () => {
  let service: ContractCompilerServiceImpl;

  const BASE_PATH = '/project/base';
  const CONTRACT_FILENAME = 'contracts/MyContract.sol';
  const CONTRACT_NAME = 'MyContract';
  const CONTRACT_CONTENT = 'contract MyContract {}';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ContractCompilerServiceImpl();
  });

  describe('compileContract', () => {
    it('should compile contract and return bytecode, abi and metadata', () => {
      const abi = [{ name: 'constructor', type: 'constructor', inputs: [] }];
      const metadata = {
        output: {
          abi,
        },
      };

      const solcOutput = {
        contracts: {
          [CONTRACT_FILENAME]: {
            [CONTRACT_NAME]: {
              evm: {
                bytecode: {
                  object: '0xabc123',
                },
              },
              metadata: JSON.stringify(metadata),
            },
          },
        },
      };

      mockCompile.mockImplementationOnce(() => JSON.stringify(solcOutput));

      const params: CompilationParams = {
        basePath: BASE_PATH,
        contractFilename: CONTRACT_FILENAME,
        contractName: CONTRACT_NAME,
        contractContent: CONTRACT_CONTENT,
      };

      const result = service.compileContract(params);

      expect(mockCompile).toHaveBeenCalledTimes(1);

      const [rawInput, compileOptions] = mockCompile.mock.calls[0];
      const parsedInput = JSON.parse(rawInput);

      expect(parsedInput.language).toBe('Solidity');
      expect(parsedInput.sources[CONTRACT_FILENAME].content).toBe(
        CONTRACT_CONTENT,
      );
      expect(parsedInput.settings.outputSelection).toEqual({
        '*': {
          '*': ['evm.bytecode.object', 'metadata'],
        },
      });

      expect(compileOptions).toHaveProperty('import');
      expect(typeof compileOptions.import).toBe('function');

      expect(result).toEqual({
        bytecode: '0xabc123',
        abiDefinition: abi,
        metadata: JSON.stringify(metadata),
      });
    });

    it('should resolve import paths using basePath for local and node_modules imports', () => {
      const params: CompilationParams = {
        basePath: BASE_PATH,
        contractFilename: CONTRACT_FILENAME,
        contractName: CONTRACT_NAME,
        contractContent: CONTRACT_CONTENT,
      };

      mockCompile.mockImplementationOnce(() => {
        return JSON.stringify({
          contracts: {
            [CONTRACT_FILENAME]: {
              [CONTRACT_NAME]: {
                evm: { bytecode: { object: '0x0' } },
                metadata: JSON.stringify({ output: { abi: [] } }),
              },
            },
          },
        });
      });

      mockReadFileSync.mockReturnValueOnce('imported content');
      mockReadFileSync.mockReturnValueOnce('node module content');

      service.compileContract(params);

      const [, compileOptions] = mockCompile.mock.calls[0];
      const importFn = compileOptions.import as (p: string) => {
        contents?: string;
        error?: string;
      };

      const localImport = 'contracts/Library.sol';
      const nodeModuleImport = '@openzeppelin/contracts/utils/Strings.sol';

      const localResult = importFn(localImport);
      const nodeModuleResult = importFn(nodeModuleImport);

      expect(mockPathResolve).toHaveBeenCalledWith(BASE_PATH, localImport);
      expect(mockPathResolve).toHaveBeenCalledWith(
        BASE_PATH,
        'node_modules',
        nodeModuleImport,
      );

      expect(localResult).toEqual({ contents: 'imported content' });
      expect(nodeModuleResult).toEqual({ contents: 'node module content' });
    });

    it('should return error from import callback when file is not found', () => {
      const params: CompilationParams = {
        basePath: BASE_PATH,
        contractFilename: CONTRACT_FILENAME,
        contractName: CONTRACT_NAME,
        contractContent: CONTRACT_CONTENT,
      };

      mockCompile.mockImplementationOnce(() => {
        return JSON.stringify({
          contracts: {
            [CONTRACT_FILENAME]: {
              [CONTRACT_NAME]: {
                evm: { bytecode: { object: '0x0' } },
                metadata: JSON.stringify({ output: { abi: [] } }),
              },
            },
          },
        });
      });

      const error = new Error('ENOENT: no such file or directory');
      mockReadFileSync.mockImplementation(() => {
        throw error;
      });

      service.compileContract(params);

      const [, compileOptions] = mockCompile.mock.calls[0];
      const importFn = compileOptions.import as (p: string) => {
        contents?: string;
        error?: string;
      };

      const missingPath = 'contracts/Missing.sol';
      const result = importFn(missingPath);

      expect(result).toEqual({ error: `File not found: ${missingPath}` });
    });
  });
});
