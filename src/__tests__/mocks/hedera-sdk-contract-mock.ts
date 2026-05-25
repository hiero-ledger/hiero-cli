import { MOCK_EVM_ADDRESS_RAW } from '@/__tests__/mocks/fixtures';

export const makeHederaSdkContractMock = () => ({
  ContractId: {
    fromString: jest.fn().mockReturnValue({
      toEvmAddress: jest.fn().mockReturnValue(MOCK_EVM_ADDRESS_RAW),
    }),
  },
  AccountId: {
    fromString: jest.fn().mockReturnValue({
      toEvmAddress: jest.fn().mockReturnValue(MOCK_EVM_ADDRESS_RAW),
      toSolidityAddress: jest.fn().mockReturnValue(MOCK_EVM_ADDRESS_RAW),
    }),
  },
  TokenType: {
    NonFungibleUnique: 'NonFungibleUnique',
    FungibleCommon: 'FungibleCommon',
  },
});
