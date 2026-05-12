import 'tsconfig-paths/register';
import {
  deleteStateFiles,
  returnFundsFromCreatedAccountsToMainAccount,
} from '@/__tests__/utils/teardown';
import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import '@/core/utils/json-serialize';
import * as dotenv from 'dotenv';
import { createCoreApi } from '@/core';
dotenv.config({ path: '.env.test' });

export default async () => {
  try {
    await returnFundsFromCreatedAccountsToMainAccount(
      createCoreApi(STATE_STORAGE_FILE_PATH),
    );
    deleteStateFiles(STATE_STORAGE_FILE_PATH);
  } catch (e) {
    throw e;
  }
};
