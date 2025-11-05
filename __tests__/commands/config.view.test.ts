import { baseState } from '../helpers/state';
import { Command } from 'commander';
import commands from '../../src/commands';
import { saveState as storeSaveState } from '../../src/state/store';

describe.skip('config view command (legacy - disabled, incompatible with ADR-003)', () => {
  const logSpy = jest.spyOn(console, 'log');

  beforeEach(() => {
    storeSaveState({ ...baseState } as any);
  });

  afterEach(() => {
    logSpy.mockClear();
  });

  test('✅ show merged configuration json', async () => {
    const program = new Command();
    commands.configCommands(program);
    await program.parseAsync([
      'node',
      'hedera-cli.ts',
      'config',
      'view',
      '--json',
    ]);
    const printed = logSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(printed).toContain('"activeNetwork"');
    expect(printed).toContain('"networks"');
  });

  test('✅ show active network only', async () => {
    const program = new Command();
    commands.configCommands(program);
    await program.parseAsync([
      'node',
      'hedera-cli.ts',
      'config',
      'view',
      '--active',
    ]);
    const calls = logSpy.mock.calls.flat();
    expect(
      calls.find((c) => typeof c === 'string' && c.includes('Active network')),
    ).toBeTruthy();
  });
});
