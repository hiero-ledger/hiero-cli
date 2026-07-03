import { MOCK_TX_ID } from '@/__tests__/mocks/fixtures';

export const VALID_PAT = 'test-portal-pat-token';
export const VALID_ALIAS = 'testnet1';

export const successResponseFixture = {
  amount: 100,
  transactionId: MOCK_TX_ID,
  dailyQuota: {
    used: 100,
    remaining: 0,
  },
};
