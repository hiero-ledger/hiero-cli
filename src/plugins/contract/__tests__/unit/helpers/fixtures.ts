import { MOCK_CONTRACT_ID, MOCK_TX_ID } from '@/__tests__/mocks/fixtures';

export const MOCK_REPO_BASE_PATH = '/mock/package/root';
export const MOCK_ERC20_PATH = `${MOCK_REPO_BASE_PATH}/dist/contracts/erc20/ERC20.sol`;
export const MOCK_ERC721_PATH = `${MOCK_REPO_BASE_PATH}/dist/contracts/erc721/ERC721.sol`;

export const MOCK_CONTRACT_CREATE_FLOW_RESULT = {
  success: true,
  transactionId: MOCK_TX_ID,
  contractId: MOCK_CONTRACT_ID,
  consensusTimestamp: '2024-01-01T00:00:00.000Z',
};

export const MOCK_COMPILATION_RESULT = {
  bytecode: '0x1234',
  abiDefinition: '[]',
  metadata: '{}',
};

export const SAMPLE_ERC20_SOL_CONTENT = `
pragma solidity ^0.8.0;
contract ERC20 {
  constructor(string memory name, string memory symbol, uint256 supply) {}
}
`;

export const SAMPLE_ERC721_SOL_CONTENT = `
pragma solidity ^0.8.0;
contract ERC721 {
  constructor(string memory name, string memory symbol) {}
}
`;
