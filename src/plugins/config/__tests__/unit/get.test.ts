import type { GetConfigOutput } from '@/plugins/config/commands/get/output';

import { getConfigOption } from '@/plugins/config/commands/get/handler';

import { enumOption } from './helpers/fixtures';
import {
  makeApiMock,
  makeCommandArgs,
  makeConfigServiceMock,
} from './helpers/mocks';

describe('config plugin - get', () => {
  test('returns option value and allowedValues for enum', async () => {
    const configSvc = makeConfigServiceMock({
      getOption: jest.fn().mockReturnValue('local'),
      listOptions: jest.fn().mockReturnValue([enumOption]),
    });
    const api = makeApiMock(configSvc);
    const args = makeCommandArgs({
      api,
      args: { option: 'default_key_manager' },
    });

    const result = await getConfigOption(args);
    const output = result.result as GetConfigOutput;
    expect(output.name).toBe('default_key_manager');
    expect(output.type).toBe('enum');
    expect(output.value).toBe('local');
    expect(output.allowedValues).toEqual(['local', 'local_encrypted']);
  });

  test('throws when getOption fails', async () => {
    const configSvc = makeConfigServiceMock({
      getOption: jest.fn().mockImplementation(() => {
        throw new Error('Option not found');
      }),
      listOptions: jest.fn().mockReturnValue([]),
    });
    const api = makeApiMock(configSvc);
    const args = makeCommandArgs({
      api,
      args: { option: 'nonexistent_option' },
    });

    await expect(getConfigOption(args)).rejects.toThrow('Option not found');
  });
});
