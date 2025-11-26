import {
  deleteStateFiles,
  returnFundsFromCreatedAccountsToMainAccount,
} from './src/__tests__/utils/teardown';
import { STATE_STORAGE_FILE_PATH } from './src/__tests__/test-constants';
import { createMockCoreApi } from './src/__tests__/mocks/core-api.mock';
import './src/core/utils/json-serialize';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

export default async () => {
  await returnFundsFromCreatedAccountsToMainAccount(createMockCoreApi());
  deleteStateFiles(STATE_STORAGE_FILE_PATH);
};
