import {
  deleteStateFiles,
  returnFundsFromCreatedAccountsToMainAccount,
} from './src/__tests__/utils/teardown';
import { STATE_STORAGE_FILE_PATH } from './src/__tests__/test-constants';
import { createCoreApi } from './src/core/core-api/core-api';
import './src/core/utils/json-serialize';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

export default async () => {
  try {
    await returnFundsFromCreatedAccountsToMainAccount(
      createCoreApi(STATE_STORAGE_FILE_PATH),
    );
    deleteStateFiles(STATE_STORAGE_FILE_PATH);
  } catch (e) {
    throw e;
  } finally {
    process.exit();
  }
};
