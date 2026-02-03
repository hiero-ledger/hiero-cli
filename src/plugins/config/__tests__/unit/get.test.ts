import { validateOutputSchema } from '@/__tests__/shared/output-validation.helper';
import { Status } from '@/core/shared/constants';
import { getConfigOption } from '@/plugins/config/commands/get/handler';
import {
  type GetConfigOutput,
  GetConfigOutputSchema,
} from '@/plugins/config/commands/get/output';

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
    expect(result.status).toBe(Status.Success);
    const output = validateOutputSchema<GetConfigOutput>(
      result.outputJson!,
      GetConfigOutputSchema,
    );
    expect(output.name).toBe('default_key_manager');
    expect(output.type).toBe('enum');
    expect(output.value).toBe('local');
    expect(output.allowedValues).toEqual(['local', 'local_encrypted']);
  });

  test('fails when option param missing', async () => {
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
    const result = await getConfigOption(args);
    expect(result.status).toBe(Status.Failure);
  });
});
