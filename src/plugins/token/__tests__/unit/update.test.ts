import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import '@/core/utils/json-serialize';

import { assertOutput } from '@/__tests__/utils/assert-output';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { MirrorNodeTokenType } from '@/core/services/mirrornode/types';
import { NULL_TOKEN } from '@/core/shared/constants';
import {
  TOKEN_UPDATE_COMMAND_NAME,
  tokenUpdate,
  TokenUpdateCommand,
} from '@/plugins/token/commands/update';
import { TokenUpdateOutputSchema } from '@/plugins/token/commands/update/output';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import {
  makeApiMocks,
  makeLogger,
  makeTransactionResult,
} from './helpers/mocks';

jest.mock('@/plugins/token/zustand-state-helper');

const DEFAULT_TOKEN_INFO = {
  token_id: '0.0.123456',
  name: 'TestToken',
  symbol: 'TEST',
  decimals: '2',
  total_supply: '100000',
  max_supply: '0',
  treasury_account_id: '0.0.200000',
  admin_key: { _type: 'ED25519', key: 'admin-key' },
  memo: '',
  type: MirrorNodeTokenType.FUNGIBLE_COMMON,
};

const DEFAULT_TREASURY_ACCOUNT = {
  accountId: '0.0.200000',
  accountPublicKey: 'treasury-public-key',
};

const makeUpdateSuccessMocks = (overrides?: {
  tokenInfo?: Partial<typeof DEFAULT_TOKEN_INFO>;
}) => {
  const mockUpdateTransaction = { test: 'update-transaction' };

  const apiMocks = makeApiMocks({
    tokens: {
      createUpdateTokenTransaction: jest
        .fn()
        .mockReturnValue(mockUpdateTransaction),
    },
    txExecute: {
      execute: jest
        .fn()
        .mockResolvedValue(makeTransactionResult({ success: true })),
    },
    mirror: {
      getTokenInfo: jest
        .fn()
        .mockResolvedValue({ ...DEFAULT_TOKEN_INFO, ...overrides?.tokenInfo }),
      getAccount: jest.fn().mockResolvedValue(DEFAULT_TREASURY_ACCOUNT),
    },
  });

  apiMocks.keyResolver.resolveSigningKeys = jest
    .fn()
    .mockResolvedValue({ keyRefIds: ['admin-key-ref-id'] });

  return { ...apiMocks, mockUpdateTransaction };
};

const makeArgs = (
  api: ReturnType<typeof makeUpdateSuccessMocks>['api'],
  argsOverrides?: Record<string, unknown>,
): CommandHandlerArgs => ({
  args: {
    token: '0.0.123456',
    tokenName: 'NewName',
    keyManager: undefined,
    adminKeys: [],
    newAdminKeys: [],
    kycKey: [],
    freezeKey: [],
    wipeKey: [],
    supplyKey: [],
    feeScheduleKey: [],
    pauseKey: [],
    metadataKey: [],
    ...argsOverrides,
  },
  api,
  state: api.state,
  config: api.config,
  logger: makeLogger(),
});

describe('tokenUpdate', () => {
  let mockSaveToken: jest.Mock;
  let mockGetToken: jest.Mock;

  beforeEach(() => {
    mockSaveToken = jest.fn();
    mockGetToken = jest.fn().mockReturnValue(null);

    (ZustandTokenStateHelper as jest.Mock).mockImplementation(() => ({
      saveToken: mockSaveToken,
      getToken: mockGetToken,
      addToken: jest.fn(),
      removeToken: jest.fn(),
    }));
  });

  describe('command metadata', () => {
    test('has correct command name', () => {
      expect(TOKEN_UPDATE_COMMAND_NAME).toBe('token_update');
    });

    test('TokenUpdateCommand is instantiable', () => {
      expect(new TokenUpdateCommand()).toBeInstanceOf(TokenUpdateCommand);
    });
  });

  describe('success scenarios', () => {
    test('returns valid output schema for name update', async () => {
      const { api } = makeUpdateSuccessMocks();

      const result = await tokenUpdate(makeArgs(api));

      const output = assertOutput(result.result, TokenUpdateOutputSchema);
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.network).toBe('testnet');
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');
    });

    test('resolves token from alias', async () => {
      const { api } = makeUpdateSuccessMocks();

      const result = await tokenUpdate(makeArgs(api, { token: 'my-token' }));

      const output = assertOutput(result.result, TokenUpdateOutputSchema);
      expect(output.tokenId).toBe('0.0.12345');
    });

    test('reports name in updatedFields when tokenName provided', async () => {
      const { api } = makeUpdateSuccessMocks();

      const result = await tokenUpdate(makeArgs(api, { tokenName: 'NewName' }));

      const output = assertOutput(result.result, TokenUpdateOutputSchema);
      expect(output.updatedFields).toContain('name');
    });

    test('reports symbol in updatedFields when symbol provided', async () => {
      const { api } = makeUpdateSuccessMocks();

      const result = await tokenUpdate(makeArgs(api, { symbol: 'NEW' }));

      const output = assertOutput(result.result, TokenUpdateOutputSchema);
      expect(output.updatedFields).toContain('symbol');
    });

    test('reports treasury in updatedFields when treasury changed', async () => {
      const { api } = makeUpdateSuccessMocks();

      const result = await tokenUpdate(
        makeArgs(api, { treasury: '0.0.999999' }),
      );

      const output = assertOutput(result.result, TokenUpdateOutputSchema);
      expect(output.updatedFields).toContain('treasury');
    });

    test('reports adminKey in updatedFields when cleared via NULL_TOKEN', async () => {
      const { api } = makeUpdateSuccessMocks();

      const result = await tokenUpdate(
        makeArgs(api, { newAdminKeys: NULL_TOKEN }),
      );

      const output = assertOutput(result.result, TokenUpdateOutputSchema);
      expect(output.updatedFields).toContain('adminKey');
    });

    test('reports kycKey (cleared) in updatedFields when cleared via NULL_TOKEN', async () => {
      const { api } = makeUpdateSuccessMocks();

      const result = await tokenUpdate(makeArgs(api, { kycKey: NULL_TOKEN }));

      const output = assertOutput(result.result, TokenUpdateOutputSchema);
      expect(output.updatedFields).toContain('kycKey (cleared)');
    });

    test('reports freezeKey (cleared) in updatedFields when cleared via NULL_TOKEN', async () => {
      const { api } = makeUpdateSuccessMocks();

      const result = await tokenUpdate(
        makeArgs(api, { freezeKey: NULL_TOKEN }),
      );

      const output = assertOutput(result.result, TokenUpdateOutputSchema);
      expect(output.updatedFields).toContain('freezeKey (cleared)');
    });

    test('reports wipeKey (cleared) when cleared', async () => {
      const { api } = makeUpdateSuccessMocks();

      const result = await tokenUpdate(makeArgs(api, { wipeKey: NULL_TOKEN }));

      const output = assertOutput(result.result, TokenUpdateOutputSchema);
      expect(output.updatedFields).toContain('wipeKey (cleared)');
    });

    test('reports supplyKey (cleared) when cleared', async () => {
      const { api } = makeUpdateSuccessMocks();

      const result = await tokenUpdate(
        makeArgs(api, { supplyKey: NULL_TOKEN }),
      );

      const output = assertOutput(result.result, TokenUpdateOutputSchema);
      expect(output.updatedFields).toContain('supplyKey (cleared)');
    });

    test('reports memo in updatedFields when memo provided', async () => {
      const { api } = makeUpdateSuccessMocks();

      const result = await tokenUpdate(makeArgs(api, { memo: 'new memo' }));

      const output = assertOutput(result.result, TokenUpdateOutputSchema);
      expect(output.updatedFields).toContain('memo');
    });

    test('reports memo (cleared) when memo cleared via NULL_TOKEN', async () => {
      const { api } = makeUpdateSuccessMocks();

      const result = await tokenUpdate(makeArgs(api, { memo: NULL_TOKEN }));

      const output = assertOutput(result.result, TokenUpdateOutputSchema);
      expect(output.updatedFields).toContain('memo (cleared)');
    });

    test('reports autoRenewPeriod in updatedFields', async () => {
      const { api } = makeUpdateSuccessMocks();

      const result = await tokenUpdate(
        makeArgs(api, { autoRenewPeriod: 7776000 }),
      );

      const output = assertOutput(result.result, TokenUpdateOutputSchema);
      expect(output.updatedFields).toContain('autoRenewPeriod');
    });

    test('reports expirationTime in updatedFields', async () => {
      const { api } = makeUpdateSuccessMocks();
      const soon = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString();

      const result = await tokenUpdate(makeArgs(api, { expirationTime: soon }));

      const output = assertOutput(result.result, TokenUpdateOutputSchema);
      expect(output.updatedFields).toContain('expirationTime');
    });

    test('reports metadata in updatedFields when provided', async () => {
      const { api } = makeUpdateSuccessMocks();

      const result = await tokenUpdate(
        makeArgs(api, { metadata: 'some-metadata' }),
      );

      const output = assertOutput(result.result, TokenUpdateOutputSchema);
      expect(output.updatedFields).toContain('metadata');
    });

    test('calls createUpdateTokenTransaction with resolved token ID and name', async () => {
      const { api, mockUpdateTransaction } = makeUpdateSuccessMocks();

      await tokenUpdate(makeArgs(api, { tokenName: 'NewName' }));

      expect(api.token.createUpdateTokenTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ tokenId: '0.0.123456', name: 'NewName' }),
      );
      expect(api.txSign.sign).toHaveBeenCalledWith(
        mockUpdateTransaction,
        expect.arrayContaining(['admin-key-ref-id']),
      );
    });

    test('calls createUpdateTokenTransaction with correct symbol', async () => {
      const { api } = makeUpdateSuccessMocks();

      await tokenUpdate(makeArgs(api, { symbol: 'NEWSYM' }));

      expect(api.token.createUpdateTokenTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ symbol: 'NEWSYM' }),
      );
    });

    test('saves updated token data to state with new name', async () => {
      const { api } = makeUpdateSuccessMocks();

      await tokenUpdate(makeArgs(api, { tokenName: 'UpdatedName' }));

      expect(mockSaveToken).toHaveBeenCalledWith(
        expect.stringContaining('0.0.123456'),
        expect.objectContaining({
          tokenId: '0.0.123456',
          name: 'UpdatedName',
        }),
      );
    });

    test('uses existing state data as fallback for unchanged fields', async () => {
      const { api } = makeUpdateSuccessMocks();
      mockGetToken.mockReturnValue({
        tokenId: '0.0.123456',
        decimals: 6,
        initialSupply: 500000n,
        adminKeyRefIds: ['existing-admin-ref'],
        adminKeyThreshold: 1,
        kycKeyRefIds: [],
        kycKeyThreshold: 0,
        freezeKeyRefIds: [],
        freezeKeyThreshold: 0,
        wipeKeyRefIds: [],
        wipeKeyThreshold: 0,
        supplyKeyRefIds: [],
        supplyKeyThreshold: 0,
        feeScheduleKeyRefIds: [],
        feeScheduleKeyThreshold: 0,
        pauseKeyRefIds: [],
        pauseKeyThreshold: 0,
        metadataKeyRefIds: [],
        metadataKeyThreshold: 0,
      });

      await tokenUpdate(makeArgs(api, { tokenName: 'NewName' }));

      expect(mockSaveToken).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ decimals: 6, initialSupply: 500000n }),
      );
    });

    test('resolves treasury key from mirror node when treasury changes', async () => {
      const { api } = makeUpdateSuccessMocks();

      await tokenUpdate(makeArgs(api, { treasury: '0.0.999' }));

      expect(api.mirror.getAccount).toHaveBeenCalledWith(
        DEFAULT_TOKEN_INFO.treasury_account_id,
      );
    });

    test('resolves admin signing keys via keyResolver', async () => {
      const { api } = makeUpdateSuccessMocks();

      await tokenUpdate(makeArgs(api));

      expect(api.keyResolver.resolveSigningKeys).toHaveBeenCalledWith(
        expect.objectContaining({
          mirrorRoleKey: DEFAULT_TOKEN_INFO.admin_key,
          signingKeyLabels: ['token:admin'],
        }),
      );
    });

    test('skips admin key resolution when token has no admin key', async () => {
      const { api } = makeUpdateSuccessMocks({
        tokenInfo: { admin_key: undefined },
      });

      const result = await tokenUpdate(makeArgs(api));

      const output = assertOutput(result.result, TokenUpdateOutputSchema);
      expect(output.tokenId).toBe('0.0.123456');
    });

    test('multiple fields reported together in updatedFields', async () => {
      const { api } = makeUpdateSuccessMocks();

      const result = await tokenUpdate(
        makeArgs(api, {
          tokenName: 'NewName',
          symbol: 'NEW',
          memo: 'new memo',
        }),
      );

      const output = assertOutput(result.result, TokenUpdateOutputSchema);
      expect(output.updatedFields).toContain('name');
      expect(output.updatedFields).toContain('symbol');
      expect(output.updatedFields).toContain('memo');
    });
  });

  describe('error scenarios', () => {
    test('throws NotFoundError when token alias not found', async () => {
      const { api } = makeUpdateSuccessMocks();

      await expect(
        tokenUpdate(makeArgs(api, { token: 'nonexistent-token' })),
      ).rejects.toThrow(NotFoundError);
    });

    test('throws TransactionError when transaction execution fails', async () => {
      const { api } = makeUpdateSuccessMocks();
      (api.txExecute.execute as jest.Mock).mockResolvedValue({
        success: false,
        transactionId: '0.0.123@1234567890.000000000',
      });

      await expect(tokenUpdate(makeArgs(api))).rejects.toThrow(
        TransactionError,
      );
    });

    test('throws ValidationError when treasury account not found on mirror node', async () => {
      const { api } = makeUpdateSuccessMocks();
      (api.mirror.getAccount as jest.Mock).mockResolvedValue(null);

      await expect(
        tokenUpdate(makeArgs(api, { treasury: '0.0.999' })),
      ).rejects.toThrow(ValidationError);
    });

    test('throws ValidationError when treasury key not found in key manager', async () => {
      const { api } = makeUpdateSuccessMocks();
      (api.kms.findByPublicKey as jest.Mock).mockReturnValue(undefined);

      await expect(
        tokenUpdate(makeArgs(api, { treasury: '0.0.999' })),
      ).rejects.toThrow(ValidationError);
    });
  });
});
