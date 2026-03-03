import type { CoreApi } from '@/core/core-api/core-api.interface';

import { CONTRACT_NAME_REGEX } from '@/plugins/contract/utils/contract-file-helpers';
import { makeApiMocks } from '@/plugins/contract-erc721/__tests__/unit/helpers/mocks';

import {
  MOCK_COMPILATION_RESULT,
  MOCK_CONTRACT_CREATE_FLOW_RESULT,
  MOCK_ERC20_PATH,
  MOCK_ERC721_PATH,
  MOCK_REPO_BASE_PATH,
  SAMPLE_ERC20_SOL_CONTENT,
  SAMPLE_ERC721_SOL_CONTENT,
} from './fixtures';

export const mockGetDefaultContractFilePath = jest.fn();
export const mockGetRepositoryBasePath = jest.fn();
export const mockReadContractFile = jest.fn();
export const mockReadContractNameFromFileContent = jest.fn();

export function setupContractFileMocks(): void {
  mockGetDefaultContractFilePath.mockImplementation((template: string) =>
    template === 'erc20' ? MOCK_ERC20_PATH : MOCK_ERC721_PATH,
  );
  mockGetRepositoryBasePath.mockReturnValue(MOCK_REPO_BASE_PATH);
  mockReadContractFile.mockImplementation((path: string) => {
    if (path.includes('erc20')) return SAMPLE_ERC20_SOL_CONTENT;
    return SAMPLE_ERC721_SOL_CONTENT;
  });
  mockReadContractNameFromFileContent.mockImplementation(
    (_basename: string, content: string) => {
      const match = content.match(CONTRACT_NAME_REGEX);
      return match ? match[1] : 'Unknown';
    },
  );
}

export function makeContractCreateApiMocks(): { api: jest.Mocked<CoreApi> } {
  const { api } = makeApiMocks({
    txExecution: {
      signAndExecuteContractCreateFlowWith: jest
        .fn()
        .mockResolvedValue(MOCK_CONTRACT_CREATE_FLOW_RESULT),
    },
    contract: {
      contractCreateFlowTransaction: jest.fn().mockReturnValue({
        transaction: {},
      }),
    },
  });

  (api.contractCompiler as { compileContract: jest.Mock }).compileContract =
    jest.fn().mockResolvedValue(MOCK_COMPILATION_RESULT);
  (api.contractVerifier as { verifyContract: jest.Mock }).verifyContract = jest
    .fn()
    .mockResolvedValue({ success: true });

  return { api };
}
