/**
 * Hedera SDK Mocks for Contract Transaction Service Tests
 * Factory functions that create fresh mock instances for each test
 */

export const createMockContractCreateFlow = () => ({
  setBytecode: jest.fn().mockReturnThis(),
  setAdminKey: jest.fn().mockReturnThis(),
  setGas: jest.fn().mockReturnThis(),
  setContractMemo: jest.fn().mockReturnThis(),
  setConstructorParameters: jest.fn().mockReturnThis(),
  setInitialBalance: jest.fn().mockReturnThis(),
  setAutoRenewPeriod: jest.fn().mockReturnThis(),
  setAutoRenewAccountId: jest.fn().mockReturnThis(),
  setMaxAutomaticTokenAssociations: jest.fn().mockReturnThis(),
  setStakedAccountId: jest.fn().mockReturnThis(),
  setStakedNodeId: jest.fn().mockReturnThis(),
  setDeclineStakingReward: jest.fn().mockReturnThis(),
});

export const createMockContractExecuteTransaction = () => ({
  setContractId: jest.fn().mockReturnThis(),
  setGas: jest.fn().mockReturnThis(),
  setFunction: jest.fn().mockReturnThis(),
});

export const createMockContractDeleteTransaction = () => ({
  setContractId: jest.fn().mockReturnThis(),
  setTransferAccountId: jest.fn().mockReturnThis(),
  setTransferContractId: jest.fn().mockReturnThis(),
});

export const createMockContractUpdateTransaction = () => ({
  setContractId: jest.fn().mockReturnThis(),
  setAdminKey: jest.fn().mockReturnThis(),
  setContractMemo: jest.fn().mockReturnThis(),
  clearContractMemo: jest.fn().mockReturnThis(),
  setAutoRenewPeriod: jest.fn().mockReturnThis(),
  setAutoRenewAccountId: jest.fn().mockReturnThis(),
  clearAutoRenewAccountId: jest.fn().mockReturnThis(),
  setMaxAutomaticTokenAssociations: jest.fn().mockReturnThis(),
  setStakedAccountId: jest.fn().mockReturnThis(),
  setStakedNodeId: jest.fn().mockReturnThis(),
  setDeclineStakingReward: jest.fn().mockReturnThis(),
});
