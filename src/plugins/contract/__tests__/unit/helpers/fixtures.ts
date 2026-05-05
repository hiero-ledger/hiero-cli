import type { ContractData } from '@/plugins/contract/schema';

import { PublicKey } from '@hiero-ledger/sdk';

import {
  ED25519_DER_PUBLIC_KEY,
  MOCK_CONTRACT_ID,
  MOCK_EVM_ADDRESS,
  MOCK_TX_ID,
} from '@/__tests__/mocks/fixtures';
import { SupportedNetwork } from '@/core/types/shared.types';

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

// contract update command fixtures
export const STORED_CONTRACT_ADMIN_REF = 'test-admin-key-ref';
export const NEW_ADMIN_KEY_REF = 'new-admin-key-ref';

export const MIRROR_CONTRACT_ADMIN_RAW = PublicKey.fromString(
  ED25519_DER_PUBLIC_KEY,
).toStringRaw();

export function makeContractData(
  overrides: Partial<ContractData> = {},
): ContractData {
  return {
    contractId: MOCK_CONTRACT_ID,
    name: 'MyContract',
    contractEvmAddress: MOCK_EVM_ADDRESS,
    adminKeyRefIds: [STORED_CONTRACT_ADMIN_REF],
    adminKeyThreshold: 1,
    network: SupportedNetwork.TESTNET,
    ...overrides,
  };
}
