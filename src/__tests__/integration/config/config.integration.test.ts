import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CoreApi } from '../../../core/core-api/core-api.interface';
import { createMockCoreApi } from '../../mocks/core-api.mock';
import { setDefaultOperatorForNetwork } from '../../utils/network-and-operator-setup';
import '../../../core/utils/json-serialize';
import { deleteStateFiles } from '../../utils/teardown';
import { STATE_STORAGE_FILE_PATH } from '../../test-constants';
import { listConfigOptions } from '../../../plugins/config/commands/list/handler';
import { ListConfigOutput } from '../../../plugins/config/commands/list';
import { Status } from '../../../core/shared/constants';
import { setConfigOption } from '../../../plugins/config/commands/set/handler';
import { SetConfigOutput } from '../../../plugins/config/commands/set';
import { getConfigOption } from '../../../plugins/config/commands/get/handler';
import { GetConfigOutput } from '../../../plugins/config/commands/get';

describe('Config Integration Tests', () => {
  let coreApi: CoreApi;

  beforeAll(async () => {
    coreApi = createMockCoreApi();
    setDefaultOperatorForNetwork(coreApi);
  });

  afterAll(async () => {
    await deleteStateFiles(STATE_STORAGE_FILE_PATH);
  });
  it('should list config options', async () => {
    const listConfigResult = await listConfigOptions({
      args: {},
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });

    expect(listConfigResult.status).toBe(Status.Success);
    const listConfigOutput: ListConfigOutput = JSON.parse(
      listConfigResult.outputJson!,
    );
    expect(listConfigOutput.totalCount).toBe(2);
    const optionNames = listConfigOutput.options.map((option) => option.name);
    expect(optionNames).toEqual(
      expect.arrayContaining([
        'ed25519_support_enabled',
        'default_key_manager',
      ]),
    );
  });

  it('should set config option and then verify it with with get method', async () => {
    const setConfigArgs: Record<string, unknown> = {
      option: 'ed25519_support_enabled',
      value: true,
    };
    const setConfigResult = await setConfigOption({
      args: setConfigArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });

    expect(setConfigResult.status).toBe(Status.Success);
    const setConfigOutput: SetConfigOutput = JSON.parse(
      setConfigResult.outputJson!,
    );
    expect(setConfigOutput.previousValue).toBe(false);
    expect(setConfigOutput.newValue).toBe(true);

    const getConfigArgs: Record<string, unknown> = {
      option: 'ed25519_support_enabled',
    };
    const getConfigResult = await getConfigOption({
      args: getConfigArgs,
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });
    expect(getConfigResult.status).toBe(Status.Success);
    const getConfigOutput: GetConfigOutput = JSON.parse(
      getConfigResult.outputJson!,
    );
    expect(getConfigOutput.name).toBe('ed25519_support_enabled');
    expect(getConfigOutput.value).toBe(true);
    expect(getConfigOutput.type).toBe('boolean');
  });
});
