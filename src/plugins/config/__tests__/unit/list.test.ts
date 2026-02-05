import { validateOutputSchema } from '@/__tests__/shared/output-validation.helper';
import { Status } from '@/core/shared/constants';
import { listConfigOptions } from '@/plugins/config/commands/list/handler';
import { ListConfigOutputSchema } from '@/plugins/config/commands/list/output';

import { booleanOption, enumOption } from './helpers/fixtures';
import {
  makeApiMock,
  makeCommandArgs,
  makeConfigServiceMock,
} from './helpers/mocks';

describe('config plugin - list', () => {
  test('returns all options with values and allowedValues for enums', async () => {
    const configSvc = makeConfigServiceMock({
      listOptions: jest.fn().mockReturnValue([enumOption, booleanOption]),
    });
    const api = makeApiMock(configSvc);
    const args = makeCommandArgs({ api });

    const result = await listConfigOptions(args);
    expect(result.status).toBe(Status.Success);
    const output = validateOutputSchema(
      result.outputJson!,
      ListConfigOutputSchema,
    );

    expect(output.totalCount).toBe(2);
    expect(output.options).toEqual(
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
