import { deleteStateFiles } from './src/__tests__/utils/teardown';
import { STATE_STORAGE_FILE_PATH } from './src/__tests__/test-constants';

export default async () => {
  deleteStateFiles(STATE_STORAGE_FILE_PATH);
};
