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

export const createMockAccountBalanceQuery = () => ({
  setAccountId: jest.fn().mockReturnThis(),
});
