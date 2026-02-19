import type { CoreApi } from '@/core';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type { NetworkService } from '@/core/services/network/network-service.interface';
import type { ImportTokenOutput } from '@/plugins/token/commands/import';

import {
  makeAliasMock,
  makeArgs,
  makeLogger,
  makeMirrorMock,
  makeNetworkMock,
  makeStateMock,
} from '@/__tests__/mocks/mocks';
import { createMockTokenInfo } from '@/core/services/mirrornode/__tests__/unit/mocks';
import { Status } from '@/core/shared/constants';
import { SupportedNetwork } from '@/core/types/shared.types';
import { importToken } from '@/plugins/token/commands/import/handler';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTokenStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTokenStateHelper as jest.Mock;

describe('token plugin - import command (ADR-003)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('imports fungible token successfully with name', async () => {
    const logger = makeLogger();
    const saveTokenMock = jest.fn().mockReturnValue(undefined);

    MockedHelper.mockImplementation(() => ({
      getToken: jest.fn().mockReturnValue(null),
      saveToken: saveTokenMock,
    }));

    const tokenInfo = createMockTokenInfo({
      token_id: '0.0.123456',
      name: 'Test Token',
      symbol: 'TEST',
      type: 'FUNGIBLE_COMMON',
      decimals: '6',
      total_supply: '1000000',
      max_supply: '1000000',
      treasury: '0.0.100',
      memo: 'Imported token memo',
      admin_key: { _type: 'ED25519', key: 'admin-key-123' },
      supply_key: { _type: 'ED25519', key: 'supply-key-456' },
    });

    const mirrorMock = makeMirrorMock() as Partial<HederaMirrornodeService> & {
      getTokenInfo: jest.Mock;
    };
    mirrorMock.getTokenInfo = jest.fn().mockResolvedValue(tokenInfo);

    const networkMock = makeNetworkMock(SupportedNetwork.TESTNET);
    const alias = makeAliasMock();

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      network: networkMock as NetworkService,
      alias,
      logger,
      state: makeStateMock(),
    };

    const args = makeArgs(api, logger, {
      token: '0.0.123456',
      name: 'my-token',
    });

    const result = await importToken(args);

    expect(mirrorMock.getTokenInfo).toHaveBeenCalledWith('0.0.123456');
    expect(alias.register).toHaveBeenCalledWith(
      expect.objectContaining({
        alias: 'my-token',
        type: 'token',
        network: SupportedNetwork.TESTNET,
        entityId: '0.0.123456',
      }),
    );
    expect(saveTokenMock).toHaveBeenCalledWith(
      '0.0.123456',
      expect.objectContaining({
        name: 'my-token',
        tokenId: '0.0.123456',
        symbol: 'TEST',
        memo: 'Imported token memo',
        network: SupportedNetwork.TESTNET,
      }),
    );

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: ImportTokenOutput = JSON.parse(result.outputJson!);
    expect(output.tokenId).toBe('0.0.123456');
    expect(output.name).toBe('my-token');
    expect(output.symbol).toBe('TEST');
    expect(output.network).toBe(SupportedNetwork.TESTNET);
    expect(output.memo).toBe('Imported token memo');
    expect(output.alias).toBe('my-token');
    expect(output.adminKeyPresent).toBe(true);
    expect(output.supplyKeyPresent).toBe(true);
  });

  test('imports token successfully without name', async () => {
    const logger = makeLogger();
    const saveTokenMock = jest.fn().mockReturnValue(undefined);

    MockedHelper.mockImplementation(() => ({
      getToken: jest.fn().mockReturnValue(null),
      saveToken: saveTokenMock,
    }));

    const tokenInfo = createMockTokenInfo({
      token_id: '0.0.999999',
      name: 'Existing Token',
      symbol: 'EXT',
      type: 'FUNGIBLE_COMMON',
    });

    const mirrorMock = makeMirrorMock() as Partial<HederaMirrornodeService> & {
      getTokenInfo: jest.Mock;
    };
    mirrorMock.getTokenInfo = jest.fn().mockResolvedValue(tokenInfo);

    const networkMock = makeNetworkMock(SupportedNetwork.TESTNET);
    const alias = makeAliasMock();

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      network: networkMock as NetworkService,
      alias,
      logger,
      state: makeStateMock(),
    };

    const args = makeArgs(api, logger, {
      token: '0.0.999999',
    });

    const result = await importToken(args);

    expect(mirrorMock.getTokenInfo).toHaveBeenCalledWith('0.0.999999');
    expect(alias.register).not.toHaveBeenCalled();
    expect(saveTokenMock).toHaveBeenCalledWith(
      '0.0.999999',
      expect.objectContaining({
        name: 'Existing Token',
        tokenId: '0.0.999999',
        network: SupportedNetwork.TESTNET,
      }),
    );

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: ImportTokenOutput = JSON.parse(result.outputJson!);
    expect(output.tokenId).toBe('0.0.999999');
    expect(output.name).toBe('Existing Token');
    expect(output.alias).toBeUndefined();
  });

  test('imports NFT token successfully', async () => {
    const logger = makeLogger();
    const saveTokenMock = jest.fn().mockReturnValue(undefined);

    MockedHelper.mockImplementation(() => ({
      getToken: jest.fn().mockReturnValue(null),
      saveToken: saveTokenMock,
    }));

    const tokenInfo = createMockTokenInfo({
      token_id: '0.0.555555',
      name: 'NFT Collection',
      symbol: 'NFT',
      type: 'NON_FUNGIBLE_UNIQUE',
      decimals: '0',
      total_supply: '0',
      max_supply: '100',
    });

    const mirrorMock = makeMirrorMock() as Partial<HederaMirrornodeService> & {
      getTokenInfo: jest.Mock;
    };
    mirrorMock.getTokenInfo = jest.fn().mockResolvedValue(tokenInfo);

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      network: makeNetworkMock(SupportedNetwork.TESTNET) as NetworkService,
      alias: makeAliasMock(),
      logger,
      state: makeStateMock(),
    };

    const args = makeArgs(api, logger, {
      token: '0.0.555555',
    });

    const result = await importToken(args);

    expect(result.status).toBe(Status.Success);
    expect(saveTokenMock).toHaveBeenCalledWith(
      '0.0.555555',
      expect.objectContaining({
        tokenId: '0.0.555555',
        name: 'NFT Collection',
        symbol: 'NFT',
      }),
    );
  });

  test('returns failure when token already exists in state', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      getToken: jest.fn().mockReturnValue({
        tokenId: '0.0.123456',
        name: 'existing',
      }),
      saveToken: jest.fn(),
    }));

    const tokenInfo = createMockTokenInfo({
      token_id: '0.0.123456',
      type: 'FUNGIBLE_COMMON',
    });

    const mirrorMock = makeMirrorMock() as Partial<HederaMirrornodeService> & {
      getTokenInfo: jest.Mock;
    };
    mirrorMock.getTokenInfo = jest.fn().mockResolvedValue(tokenInfo);

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      network: makeNetworkMock(SupportedNetwork.TESTNET) as NetworkService,
      alias: makeAliasMock(),
      logger,
      state: makeStateMock(),
    };

    const args = makeArgs(api, logger, {
      token: '0.0.123456',
      name: 'new-token',
    });

    const result = await importToken(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBeDefined();
    expect(result.errorMessage).toContain(
      "Token with ID '0.0.123456' already exists in state",
    );
  });

  test('returns failure when mirror.getTokenInfo throws', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      getToken: jest.fn().mockReturnValue(null),
      saveToken: jest.fn(),
    }));

    const mirrorMock = makeMirrorMock() as Partial<HederaMirrornodeService> & {
      getTokenInfo: jest.Mock;
    };
    mirrorMock.getTokenInfo = jest
      .fn()
      .mockRejectedValue(new Error('Token not found'));

    const api: Partial<CoreApi> = {
      mirror: mirrorMock as HederaMirrornodeService,
      network: makeNetworkMock(SupportedNetwork.TESTNET) as NetworkService,
      alias: makeAliasMock(),
      logger,
      state: makeStateMock(),
    };

    const args = makeArgs(api, logger, {
      token: '0.0.123456',
    });

    const result = await importToken(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBeDefined();
    expect(result.errorMessage).toContain('Token not found');
  });
});
