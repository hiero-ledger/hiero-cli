export interface ContractVerificationParams {
  contractFilename: string;
  contractContent: string;
  metadataContent: string;
  contractEvmAddress: string;
}

export interface ContractVerificationResult {
  address: string;
  chainId: string;
  status: string;
  message: string;
}

export interface SmartContractVerifyApiOkResponse {
  result: {
    address: string;
    chainId: string;
    status: string;
    message: string;
    libraryMap: object;
  }[];
}

export interface SmartContractVerifyApiErrorResponse {
  error: string;
}
