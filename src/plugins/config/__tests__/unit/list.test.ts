import { listConfigOptions } from '../../../config/commands/list/handler';
import { Status } from '../../../../core/shared/constants';
import {
  makeApiMock,
  makeCommandArgs,
  makeConfigServiceMock,
} from './helpers/mocks';
import { enumOption, booleanOption } from './helpers/fixtures';

describe('config plugin - list', () => {
  test('returns all options with values and allowedValues for enums', async () => {
    const configSvc = makeConfigServiceMock({
      listOptions: jest.fn().mockReturnValue([enumOption, booleanOption]),
    });
    const api = makeApiMock(configSvc);
    const args = makeCommandArgs({ api });

    const result = await listConfigOptions(args);
    expect(result.status).toBe(Status.Success);
    const parsed = JSON.parse(result.outputJson as string);

    expect(parsed.totalCount).toBe(2);
    expect(parsed.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'default_key_manager',
          type: 'enum',
          value: 'local',
          allowedValues: ['local', 'local_encrypted'],
        }),
        expect.objectContaining({
          name: 'ed25519_support_enabled',
          type: 'boolean',
          value: false,
        }),
      ]),
    );
  });
});
