export interface ContractVerificationParams {
  contractFile: string;
  metadataContent: string;
  contractEvmAddress: string;
}

export interface ContractVerificationResult {
  success: boolean;
  address?: string;
  chainId?: string;
  status?: string;
  message?: string;
  /** When success is false, contains the API or error message. */
  errorMessage?: string;
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
