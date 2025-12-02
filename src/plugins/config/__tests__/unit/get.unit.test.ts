import { getConfigOption } from '../../../config/commands/get/handler';
import { Status } from '../../../../core/shared/constants';
import {
  makeApiMock,
  makeCommandArgs,
  makeConfigServiceMock,
} from './helpers/mocks';
import { enumOption } from './helpers/fixtures';

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
    const parsed = JSON.parse(result.outputJson as string);
    expect(parsed.name).toBe('default_key_manager');
    expect(parsed.type).toBe('enum');
    expect(parsed.value).toBe('local');
    expect(parsed.allowedValues).toEqual(['local', 'local_encrypted']);
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
