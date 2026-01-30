import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { CreateFungibleTokenFromFileOutput } from '@/plugins/token/commands/create-ft-from-file';

import '@/core/utils/json-serialize';

import * as fs from 'fs/promises';
import * as path from 'path';

import { STATE_STORAGE_FILE_PATH } from '@/__tests__/test-constants';
import { delay } from '@/__tests__/utils/common-utils';
import { setDefaultOperatorForNetwork } from '@/__tests__/utils/network-and-operator-setup';
import { createCoreApi } from '@/core';
import { Status } from '@/core/shared/constants';
import { createTokenFromFile } from '@/plugins/token';

const TEMP_DIR = path.join(__dirname, 'temp-token-files');

describe('Token Custom Fees Integration Tests', () => {
  let coreApi: CoreApi;
  let network: SupportedNetwork;

  beforeAll(async () => {
    coreApi = createCoreApi(STATE_STORAGE_FILE_PATH);
    await setDefaultOperatorForNetwork(coreApi);
    network = coreApi.network.getCurrentNetwork();

    await fs.mkdir(TEMP_DIR, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
  });

  it('should create FT with fixed HBAR fee', async () => {
    const operatorAccountId = coreApi.network.getOperatorAccountId();

    const tokenFile = {
      name: `FixedHbarFeeToken-${Date.now()}`,
      symbol: 'FHBAR',
      decimals: 8,
      supplyType: 'infinite',
      initialSupply: 1000000,
      treasuryKey: operatorAccountId,
      adminKey: operatorAccountId,
      customFees: [
        {
          type: 'fixed',
          amount: 100,
          unitType: 'HBAR',
          collectorId: operatorAccountId,
          exempt: false,
        },
      ],
      memo: 'Token with fixed HBAR fee',
    };

    const filePath = path.join(TEMP_DIR, 'fixed-hbar-fee.json');
    await fs.writeFile(filePath, JSON.stringify(tokenFile, null, 2));

    const result = await createTokenFromFile({
      args: { file: filePath },
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });

    expect(result.status).toBe(Status.Success);
    const output: CreateFungibleTokenFromFileOutput = JSON.parse(
      result.outputJson!,
    );
    expect(output.tokenId).toBeDefined();
    expect(output.name).toBe(tokenFile.name);
    expect(output.network).toBe(network);

    await delay(5000);
  });

  it('should create FT with fractional fee', async () => {
    const operatorAccountId = coreApi.network.getOperatorAccountId();

    const tokenFile = {
      name: `FractionalFeeToken-${Date.now()}`,
      symbol: 'FFRAC',
      decimals: 8,
      supplyType: 'infinite',
      initialSupply: 1000000,
      treasuryKey: operatorAccountId,
      adminKey: operatorAccountId,
      customFees: [
        {
          type: 'fractional',
          numerator: 1,
          denominator: 10,
          min: 10,
          max: 1000,
          netOfTransfers: true,
          collectorId: operatorAccountId,
          exempt: false,
        },
      ],
      memo: 'Token with fractional fee',
    };

    const filePath = path.join(TEMP_DIR, 'fractional-fee.json');
    await fs.writeFile(filePath, JSON.stringify(tokenFile, null, 2));

    const result = await createTokenFromFile({
      args: { file: filePath },
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });

    expect(result.status).toBe(Status.Success);
    const output: CreateFungibleTokenFromFileOutput = JSON.parse(
      result.outputJson!,
    );
    expect(output.tokenId).toBeDefined();
    expect(output.name).toBe(tokenFile.name);
    expect(output.network).toBe(network);

    await delay(5000);
  });

  it('should create FT with fixed TOKEN fee', async () => {
    const operatorAccountId = coreApi.network.getOperatorAccountId();

    const tokenFile = {
      name: `FixedTokenFeeToken-${Date.now()}`,
      symbol: 'FTOK',
      decimals: 8,
      supplyType: 'infinite',
      initialSupply: 1000000,
      treasuryKey: operatorAccountId,
      adminKey: operatorAccountId,
      customFees: [
        {
          type: 'fixed',
          amount: 50,
          unitType: 'TOKEN',
          collectorId: operatorAccountId,
          exempt: false,
        },
      ],
      memo: 'Token with fixed TOKEN fee',
    };

    const filePath = path.join(TEMP_DIR, 'fixed-token-fee.json');
    await fs.writeFile(filePath, JSON.stringify(tokenFile, null, 2));

    const result = await createTokenFromFile({
      args: { file: filePath },
      api: coreApi,
      state: coreApi.state,
      logger: coreApi.logger,
      config: coreApi.config,
    });

    expect(result.status).toBe(Status.Success);
    const output: CreateFungibleTokenFromFileOutput = JSON.parse(
      result.outputJson!,
    );
    expect(output.tokenId).toBeDefined();
    expect(output.name).toBe(tokenFile.name);
    expect(output.network).toBe(network);

    await delay(5000);
  });
});
