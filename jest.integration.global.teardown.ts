import 'tsconfig-paths/register';
import {
  deleteStateFiles,
  returnFundsFromCreatedAccountsToMainAccount,
} from '@/__tests__/utils/teardown';
import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import '@/core/utils/json-serialize';
import * as dotenv from 'dotenv';
import { createMockCoreApi } from '@/__tests__/mocks/core-api.mock';
dotenv.config({ path: '.env.test' });

export default async () => {
  try {
    await returnFundsFromCreatedAccountsToMainAccount(
      createMockCoreApi(STATE_STORAGE_FILE_PATH),
    );
    deleteStateFiles(STATE_STORAGE_FILE_PATH);
  } catch (e) {
    throw e;
  } finally {
    process.exit();
  }
};
