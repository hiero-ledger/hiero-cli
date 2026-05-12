import 'tsconfig-paths/register';

import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { deleteStateFiles } from '@/__tests__/utils/teardown';

export default async () => {
  deleteStateFiles(STATE_STORAGE_FILE_PATH);
};
