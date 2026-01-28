export interface CompilationParams {
  contractFilename: string;
  contractName: string;
  contractContent: string;
  basePath: string;
  solidityVersion?: string;
}

export interface CompilationResult {
  bytecode: string;
  abiDefinition: string;
  metadata: string;
}

export interface SolcInput {
  language: string;
  sources: {
    [fileName: string]: {
      content: string;
    };
  };
  settings: {
    outputSelection: {
      [file: string]: {
        [contract: string]: string[];
      };
    };
  };
}

export interface SolcImportResult {
  contents?: string;
  error?: string;
}

export interface SolcBytecode {
  object: string;
}

export interface SolcEvm {
  bytecode: SolcBytecode;
}

export interface SolcAbi {
  abi: string;
}

export interface SolcMetadata {
  output: SolcAbi;
}

export interface SolcContract {
  evm: SolcEvm;
  abi: string;
  metadata: string;
}

export interface SolcOutput {
  contracts: {
    // output contracts, each contract is represented by a file name and a contract name in each file
    [fileName: string]: {
      [contractName: string]: SolcContract;
    };
  };
}
