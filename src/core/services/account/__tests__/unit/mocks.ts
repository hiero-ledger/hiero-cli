/**
 * Hedera SDK Mocks for Account Transaction Service Tests
 * Factory functions that create fresh mock instances for each test
 */

export const createMockAccountCreateTransaction = () => ({
  setInitialBalance: jest.fn().mockReturnThis(),
  setECDSAKeyWithAlias: jest.fn().mockReturnThis(),
  setKeyWithoutAlias: jest.fn().mockReturnThis(),
  setMaxAutomaticTokenAssociations: jest.fn().mockReturnThis(),
});

export const createMockAccountInfoQuery = () => ({
  setAccountId: jest.fn().mockReturnThis(),
});

export const createMockAccountUpdateTransaction = () => ({
  setAccountId: jest.fn().mockReturnThis(),
  setKey: jest.fn().mockReturnThis(),
  setAccountMemo: jest.fn().mockReturnThis(),
  clearAccountMemo: jest.fn().mockReturnThis(),
  setMaxAutomaticTokenAssociations: jest.fn().mockReturnThis(),
  setStakedAccountId: jest.fn().mockReturnThis(),
  clearStakedAccountId: jest.fn().mockReturnThis(),
  setStakedNodeId: jest.fn().mockReturnThis(),
  clearStakedNodeId: jest.fn().mockReturnThis(),
  setDeclineStakingReward: jest.fn().mockReturnThis(),
  setAutoRenewPeriod: jest.fn().mockReturnThis(),
  setReceiverSignatureRequired: jest.fn().mockReturnThis(),
});
