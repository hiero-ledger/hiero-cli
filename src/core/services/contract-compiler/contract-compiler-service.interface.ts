import type {
  CompilationParams,
  CompilationResult,
} from '@/core/services/contract-compiler/types';

export interface ContractCompilerService {
  compileContract(params: CompilationParams): CompilationResult;
}
