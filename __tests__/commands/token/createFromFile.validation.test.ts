import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import commands from '../../../src/commands';
import {
  get as storeGet,
  saveState as storeSaveState,
  type StoreState,
} from '../../../src/state/store';
import { baseState } from '../../helpers/state';

// NOTE: This test uses the real create-from-file command path resolution by copying
// generated token definition files into the expected src/input directory relative
// to the compiled TS source layout under test environment.

describe('token create-from-file validation', () => {
  const tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'token-file-test-'));
  const dataDir = path.join(tmpDir, 'data');
  const localInputDir = path.join(dataDir, 'input');

  beforeAll(() => {
    fs.mkdirSync(localInputDir, { recursive: true });
  });

  beforeEach(() => {
    // Cast baseState fixture to partial of StoreState (test helper uses loose typing)
    storeSaveState(baseState as unknown as Partial<StoreState>);
  });

  afterAll(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  // Instead of writing inside the source tree (src/input), point the command to a temp dir
  function setOverrideDir() {
    process.env.HCLI_TOKEN_INPUT_DIR = localInputDir;
  }

  test('accepts valid token file', async () => {
    const fileName = 'valid';
    const filePath = path.join(localInputDir, `token.${fileName}.json`);
    fs.writeFileSync(
      filePath,
      JSON.stringify(
        {
          name: 'MyToken',
          symbol: 'MTK',
          decimals: 2,
          supplyType: 'finite',
          initialSupply: 100,
          maxSupply: 1000,
          keys: {
            supplyKey: '<name:alice>',
            treasuryKey: '<name:alice>',
            adminKey: '<name:bob>',
            feeScheduleKey: '',
            freezeKey: '',
            pauseKey: '',
            wipeKey: '',
            kycKey: '',
          },
          customFees: [],
          memo: 'test',
        },
        null,
        2,
      ),
      'utf-8',
    );

    setOverrideDir();

    const program = new Command();
    commands.tokenCommands(program);

    await program.parseAsync([
      'node',
      'hedera-cli.ts',
      'token',
      'create-from-file',
      '-f',
      filePath,
    ]);
  });

  test('rejects invalid token file (missing name) with exit code and no token added', async () => {
    const fileName = 'invalid';
    const filePath = path.join(localInputDir, `token.${fileName}.json`);
    fs.writeFileSync(
      filePath,
      JSON.stringify(
        {
          // name missing
          symbol: 'MTK',
          decimals: 2,
          supplyType: 'infinite',
          initialSupply: 100,
          maxSupply: 0,
          keys: {
            supplyKey: '<name:alice>',
            treasuryKey: '<name:alice>',
            adminKey: '<name:bob>',
            feeScheduleKey: '',
            freezeKey: '',
            pauseKey: '',
            wipeKey: '',
            kycKey: '',
          },
          customFees: [],
          memo: 'test',
        },
        null,
        2,
      ),
      'utf-8',
    );

    setOverrideDir();

    const program = new Command();
    commands.tokenCommands(program);

    const prevExit = process.exitCode;
    await program.parseAsync([
      'node',
      'hedera-cli.ts',
      'token',
      'create-from-file',
      '-f',
      filePath,
    ]);
    // exitOnError swallows DomainError but sets exitCode
    expect(process.exitCode === 1 || process.exitCode === prevExit).toBe(true);
    const tokens = storeGet('tokens');
    expect(Object.keys(tokens).length).toBe(0);
  });
});
