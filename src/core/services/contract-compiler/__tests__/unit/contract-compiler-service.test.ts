/**
 * Unit tests for ContractCompilerServiceImpl
 * Tests Solidity contract compilation and import resolution
 */
import type { CompilationParams } from '@/core/services/contract-compiler/types';

import * as fs from 'fs';
import * as path from 'path';

import { ContractCompilerServiceImpl } from '@/core/services/contract-compiler/contract-compiler-service';

// Use a global object to store the mock compile function
// This works around Jest's hoisting of jest.mock()
interface GlobalWithMockSolc {
  __mockSolcCompile?: jest.Mock;
}

const globalWithMock = global as GlobalWithMockSolc;
globalWithMock.__mockSolcCompile = jest.fn();

jest.mock('@/core/utils/solc-loader', () => ({
  loadSolcVersion: jest.fn(() =>
    Promise.resolve({
      compile: globalWithMock.__mockSolcCompile,
    }),
  ),
}));

// Export a reference to the mock compile for use in tests
const mockSolcModule = {
  get compile() {
    return globalWithMock.__mockSolcCompile!;
  },
};

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

jest.mock('path', () => ({
  basename: jest.fn((p: string) => p.split('/').pop() ?? p),
  dirname: jest.fn((p: string) => p.split('/').slice(0, -1).join('/')),
  resolve: jest.fn((...segments: string[]) => segments.join('/')),
}));

const CONTRACT_BASENAME = 'MyContract.sol';

jest.mock('@/core/utils/solidity-file-importer-util', () => {
  return {
    createFindImports: jest.fn((baseDir: string) => (importPath: string) => {
      const normalized = importPath.replace(/\\/g, '/');
      try {
        const localPath = path.resolve(baseDir, normalized);
        return { contents: fs.readFileSync(localPath, 'utf8') };
      } catch {
        try {
          const nodePath = path.resolve(baseDir, 'node_modules', normalized);
          return { contents: fs.readFileSync(nodePath, 'utf8') };
        } catch {
          return { error: `Import not found: ${importPath}` };
        }
      }
    }),
  };
});

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
    it('should compile contract and return bytecode, abi and metadata', async () => {
      const abi = [{ name: 'constructor', type: 'constructor', inputs: [] }];
      const metadata = {
        output: {
          abi,
        },
      };

      const solcOutput = {
        contracts: {
          [CONTRACT_BASENAME]: {
            [CONTRACT_NAME]: {
              evm: {
                bytecode: {
                  object: '0xabc123',
                },
              },
              abi: JSON.stringify(abi),
              metadata: JSON.stringify(metadata),
            },
          },
        },
      };

      mockSolcModule.compile.mockImplementationOnce(() =>
        JSON.stringify(solcOutput),
      );

      const params: CompilationParams = {
        basePath: BASE_PATH,
        contractFilename: CONTRACT_FILENAME,
        contractName: CONTRACT_NAME,
        contractContent: CONTRACT_CONTENT,
      };

      const result = await service.compileContract(params);

      expect(mockSolcModule.compile).toHaveBeenCalledTimes(1);

      const [rawInput, compileOptions] = mockSolcModule.compile.mock.calls[0];
      const parsedInput = JSON.parse(rawInput);

      expect(parsedInput.language).toBe('Solidity');
      expect(parsedInput.sources[CONTRACT_BASENAME].content).toBe(
        CONTRACT_CONTENT,
      );
      expect(parsedInput.settings.outputSelection).toEqual({
        '*': {
          '*': ['abi', 'evm.bytecode.object', 'metadata'],
        },
      });

      expect(compileOptions).toHaveProperty('import');
      expect(typeof compileOptions.import).toBe('function');

      expect(result).toEqual({
        bytecode: '0xabc123',
        abiDefinition: JSON.stringify(abi),
        metadata: JSON.stringify(metadata),
      });
    });

    it('should resolve import paths using basePath for local and node_modules imports', async () => {
      const params: CompilationParams = {
        basePath: BASE_PATH,
        contractFilename: CONTRACT_FILENAME,
        contractName: CONTRACT_NAME,
        contractContent: CONTRACT_CONTENT,
      };

      mockSolcModule.compile.mockImplementationOnce(() => {
        return JSON.stringify({
          contracts: {
            [CONTRACT_BASENAME]: {
              [CONTRACT_NAME]: {
                evm: { bytecode: { object: '0x0' } },
                abi: JSON.stringify([]),
                metadata: JSON.stringify({ output: { abi: [] } }),
              },
            },
          },
        });
      });

      mockReadFileSync
        .mockReturnValueOnce('imported content')
        .mockImplementationOnce(() => {
          throw new Error('ENOENT');
        })
        .mockReturnValueOnce('node module content');

      await service.compileContract(params);

      const [, compileOptions] = mockSolcModule.compile.mock.calls[0];
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

    it('should return error from import callback when file is not found', async () => {
      const params: CompilationParams = {
        basePath: BASE_PATH,
        contractFilename: CONTRACT_FILENAME,
        contractName: CONTRACT_NAME,
        contractContent: CONTRACT_CONTENT,
      };

      mockSolcModule.compile.mockImplementationOnce(() => {
        return JSON.stringify({
          contracts: {
            [CONTRACT_BASENAME]: {
              [CONTRACT_NAME]: {
                evm: { bytecode: { object: '0x0' } },
                abi: JSON.stringify([]),
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

      await service.compileContract(params);

      const [, compileOptions] = mockSolcModule.compile.mock.calls[0];
      const importFn = compileOptions.import as (p: string) => {
        contents?: string;
        error?: string;
      };

      const missingPath = 'contracts/Missing.sol';
      const result = importFn(missingPath);

      expect(result).toEqual({ error: `Import not found: ${missingPath}` });
    });
  });
});
