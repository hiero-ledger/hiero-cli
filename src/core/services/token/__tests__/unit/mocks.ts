/**
 * Hedera SDK Mocks for Token Service Tests
 * Factory functions that create fresh mock instances for each test
 */

export const createMockTransferTransaction = () => ({
  addTokenTransfer: jest.fn().mockReturnThis(),
});

export const createMockTokenCreateTransaction = () => ({
  setTokenName: jest.fn().mockReturnThis(),
  setTokenSymbol: jest.fn().mockReturnThis(),
  setDecimals: jest.fn().mockReturnThis(),
  setInitialSupply: jest.fn().mockReturnThis(),
  setTokenType: jest.fn().mockReturnThis(),
  setSupplyType: jest.fn().mockReturnThis(),
  setTreasuryAccountId: jest.fn().mockReturnThis(),
  setAdminKey: jest.fn().mockReturnThis(),
  setMaxSupply: jest.fn().mockReturnThis(),
  setCustomFees: jest.fn().mockReturnThis(),
  setTokenMemo: jest.fn().mockReturnThis(),
  setSupplyKey: jest.fn().mockReturnThis(),
  setWipeKey: jest.fn().mockReturnThis(),
  setKycKey: jest.fn().mockReturnThis(),
  setFreezeKey: jest.fn().mockReturnThis(),
  setPauseKey: jest.fn().mockReturnThis(),
  setFeeScheduleKey: jest.fn().mockReturnThis(),
});

export const createMockTokenAssociateTransaction = () => ({
  setAccountId: jest.fn().mockReturnThis(),
  setTokenIds: jest.fn().mockReturnThis(),
});

export const createMockCustomFixedFee = () => ({
  setHbarAmount: jest.fn().mockReturnThis(),
  setFeeCollectorAccountId: jest.fn().mockReturnThis(),
  setAllCollectorsAreExempt: jest.fn().mockReturnThis(),
});
