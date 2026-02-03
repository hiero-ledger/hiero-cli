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
});
