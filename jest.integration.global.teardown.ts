import 'tsconfig-paths/register';
import {
  deleteStateFiles,
  returnFundsFromCreatedAccountsToMainAccount,
} from '@/__tests__/utils/teardown';
import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import '@/core/utils/json-serialize';
import { createCoreApi } from '@/core';
import { SupportedNetwork } from '@/core/types/shared.types';

// The environment is loaded by `jest.integration.config.js`: doing it here
// would be too late, since the imports above already froze `process.env` in
// `network.config`.

export default async () => {
  try {
    const coreApi = createCoreApi(STATE_STORAGE_FILE_PATH);
    // Only a shared network makes refunds worth it: on localnet the test
    // funds are worthless, and the suite also imports accounts it does not
    // own (e.g. the Solo genesis account), which must not be drained.
    if (coreApi.network.getCurrentNetwork() !== SupportedNetwork.LOCALNET) {
      await returnFundsFromCreatedAccountsToMainAccount(coreApi);
    }
    deleteStateFiles(STATE_STORAGE_FILE_PATH);
  } catch (e) {
    throw e;
  }
};
