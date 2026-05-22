import type { IdentityResolutionService } from '@/core/services/identity-resolution/identity-resolution-service.interface';
import type { KeyResolverService } from '@/core/services/key-resolver/key-resolver-service.interface';
import type { KmsService } from '@/core/services/kms/kms-service.interface';
import type { Credential } from '@/core/services/kms/kms-types.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type { TokenService } from '@/core/services/token/token-service.interface';
import type { TxExecuteService } from '@/core/services/tx-execute/tx-execute-service.interface';
import type { TxSignService } from '@/core/services/tx-sign/tx-sign-service.interface';
import type { TokenCreateFtInput } from '@/plugins/token/commands/create-ft/input';
import type { FungibleTokenFileDefinition } from '@/plugins/token/schema';

import { createMockTransaction } from '@/__tests__/mocks/hedera-sdk-mocks';
import { NotFoundError } from '@/core/errors';
import { KeyManager } from '@/core/services/kms/kms-types.interface';
import {
  AliasType,
  EntityReferenceType,
  SupportedNetwork,
} from '@/core/types/shared.types';
import { TokenAssociationsServiceImpl } from '@/plugins/token/services/token-associations.service';
import { TokenKeysServiceImpl } from '@/plugins/token/services/token-keys.service';
import { TokenPendingAirdropsServiceImpl } from '@/plugins/token/services/token-pending-airdrops.service';
import { TokenReferenceServiceImpl } from '@/plugins/token/services/token-reference.service';

describe('Token services', () => {
  describe('TokenReferenceServiceImpl', () => {
    test('resolves token alias through identity resolution service', () => {
      const identityResolution = {
        resolveReferenceToEntityOrEvmAddress: jest.fn().mockReturnValue({
          entityIdOrEvmAddress: '0.0.123',
        }),
      } as unknown as jest.Mocked<IdentityResolutionService>;
      const service = new TokenReferenceServiceImpl(identityResolution);

      expect(
        service.resolveToken('my-token', SupportedNetwork.TESTNET),
      ).toEqual({
        tokenId: '0.0.123',
      });
      expect(
        identityResolution.resolveReferenceToEntityOrEvmAddress,
      ).toHaveBeenCalledWith({
        entityReference: 'my-token',
        referenceType: EntityReferenceType.ALIAS,
        network: SupportedNetwork.TESTNET,
        aliasType: AliasType.Token,
      });
    });

    test('resolves destination account through identity resolution service', async () => {
      const identityResolution = {
        resolveAccount: jest.fn().mockResolvedValue({ accountId: '0.0.1001' }),
      } as unknown as jest.Mocked<IdentityResolutionService>;
      const service = new TokenReferenceServiceImpl(identityResolution);

      await expect(
        service.resolveDestinationAccount('treasury', SupportedNetwork.TESTNET),
      ).resolves.toEqual({ accountId: '0.0.1001' });
    });
  });

  describe('TokenKeysServiceImpl', () => {
    test('resolves optional keys with configured key manager and tag', async () => {
      const keyResolver = {
        resolveSigningKey: jest.fn().mockResolvedValue({
          keyRefId: 'key-1',
          publicKey: 'public-key-1',
        }),
      } as unknown as jest.Mocked<KeyResolverService>;
      const keyManager = KeyManager.local;
      const service = new TokenKeysServiceImpl(keyResolver);
      const credentials = [{ rawValue: 'admin-key' }] as Credential[];

      await expect(
        service.resolveOptionalKeys(credentials, keyManager, 'token:admin'),
      ).resolves.toEqual([{ keyRefId: 'key-1', publicKey: 'public-key-1' }]);
      expect(keyResolver.resolveSigningKey).toHaveBeenCalledWith(
        credentials[0],
        keyManager,
        false,
        ['token:admin'],
      );
    });

    test('returns undefined for missing optional key', async () => {
      const keyResolver = {} as jest.Mocked<KeyResolverService>;
      const service = new TokenKeysServiceImpl(keyResolver);

      await expect(
        service.resolveOptionalKey(undefined, KeyManager.local, 'token:supply'),
      ).resolves.toBeUndefined();
    });

    test('resolves create FT keys with domain method', async () => {
      const keyResolver = {
        resolveAccountCredentials: jest.fn().mockResolvedValue({
          accountId: '0.0.1001',
          keyRefId: 'treasury-key',
          publicKey: 'treasury-public-key',
        }),
        resolveSigningKey: jest
          .fn()
          .mockResolvedValue({ keyRefId: 'role-key', publicKey: 'role-pub' }),
      } as unknown as jest.Mocked<KeyResolverService>;
      const service = new TokenKeysServiceImpl(keyResolver);
      const credential = { rawValue: 'role-key' } as Credential;
      const input = {
        treasury: { rawValue: 'treasury' },
        adminKey: [credential],
        supplyKey: [],
        freezeKey: [],
        wipeKey: [],
        kycKey: [],
        pauseKey: [],
        feeScheduleKey: [],
        metadataKey: [],
      } as unknown as TokenCreateFtInput;

      const result = await service.resolveCreateFtKeys(input, KeyManager.local);

      expect(result.treasury.keyRefId).toBe('treasury-key');
      expect(result.admin).toEqual([
        { keyRefId: 'role-key', publicKey: 'role-pub' },
      ]);
      expect(keyResolver.resolveAccountCredentials).toHaveBeenCalledWith(
        input.treasury,
        KeyManager.local,
        true,
        ['token:treasury'],
      );
    });

    test('resolves create FT from file keys with keyRefIds', async () => {
      const keyResolver = {
        resolveAccountCredentials: jest.fn().mockResolvedValue({
          accountId: '0.0.1001',
          keyRefId: 'treasury-key',
          publicKey: 'treasury-public-key',
        }),
        resolveSigningKey: jest.fn().mockResolvedValueOnce({
          keyRefId: 'admin-key',
          publicKey: 'admin-public-key',
        }),
      } as unknown as jest.Mocked<KeyResolverService>;
      const service = new TokenKeysServiceImpl(keyResolver);
      const tokenDefinition = {
        treasuryKey: { rawValue: 'treasury' },
        adminKey: [{ rawValue: 'admin' }],
        supplyKey: [],
        wipeKey: [],
        kycKey: [],
        freezeKey: [],
        pauseKey: [],
        feeScheduleKey: [],
        metadataKey: [],
      } as unknown as FungibleTokenFileDefinition;

      const result = await service.resolveCreateFtFromFileKeys(
        tokenDefinition,
        KeyManager.local,
      );

      expect(result.keyRefIds).toEqual(['treasury-key', 'admin-key']);
      expect(result.adminKeys).toEqual([
        { keyRefId: 'admin-key', publicKey: 'admin-public-key' },
      ]);
    });

    test('resolves updated treasury from mirror node and KMS', async () => {
      const keyResolver = {} as jest.Mocked<KeyResolverService>;
      const mirror = {
        getAccount: jest.fn().mockResolvedValue({
          accountId: '0.0.2002',
          accountPublicKey: 'treasury-public-key',
        }),
      } as unknown as jest.Mocked<HederaMirrornodeService>;
      const kms = {
        findByPublicKey: jest.fn().mockReturnValue({
          keyRefId: 'treasury-key',
          publicKey: 'treasury-public-key',
        }),
      } as unknown as jest.Mocked<KmsService>;
      const service = new TokenKeysServiceImpl(keyResolver, mirror, kms);

      await expect(
        service.resolveUpdatedTreasury({
          treasuryAccountId: '0.0.2002',
          keyManager: KeyManager.local,
        }),
      ).resolves.toEqual({
        accountId: '0.0.2002',
        keyRefId: 'treasury-key',
        publicKey: 'treasury-public-key',
      });
    });
  });

  describe('TokenPendingAirdropsServiceImpl', () => {
    const makeService = (
      overrides: {
        mirror?: Partial<jest.Mocked<HederaMirrornodeService>>;
        tokenReference?: Partial<jest.Mocked<TokenReferenceServiceImpl>>;
      } = {},
    ) => {
      const mirror = {
        getPendingAirdrops: jest.fn().mockResolvedValue({
          airdrops: [
            {
              amount: 100,
              receiver_id: '0.0.1001',
              sender_id: '0.0.2002',
              serial_number: null,
              timestamp: { from: '1.0', to: null },
              token_id: '0.0.3003',
            },
          ],
          links: { next: null },
        }),
        getTokenInfo: jest.fn().mockResolvedValue({
          token_id: '0.0.3003',
          name: 'Token',
          symbol: 'TOK',
          decimals: '2',
          total_supply: '100',
          max_supply: '0',
          type: 'FUNGIBLE_COMMON',
          treasury_account_id: '0.0.2002',
          created_timestamp: '1.0',
          pause_status: 'NOT_APPLICABLE',
          memo: '',
        }),
        ...overrides.mirror,
      } as unknown as jest.Mocked<HederaMirrornodeService>;
      const logger = {
        info: jest.fn(),
      } as unknown as jest.Mocked<Logger>;
      const tokenReference = {
        resolveDestinationAccount: jest
          .fn()
          .mockResolvedValue({ accountId: '0.0.1001' }),
        ...overrides.tokenReference,
      } as unknown as jest.Mocked<TokenReferenceServiceImpl>;
      const service = new TokenPendingAirdropsServiceImpl(
        mirror,
        logger,
        tokenReference,
      );

      return { service, mirror, tokenReference };
    };

    test('builds pending airdrops output', async () => {
      const { service, mirror } = makeService();

      await expect(
        service.getPendingAirdrops(
          'account-alias',
          false,
          SupportedNetwork.TESTNET,
        ),
      ).resolves.toEqual({
        account: '0.0.1001',
        network: SupportedNetwork.TESTNET,
        hasMore: false,
        total: 1,
        airdrops: [
          {
            tokenId: '0.0.3003',
            tokenName: 'Token',
            tokenSymbol: 'TOK',
            senderId: '0.0.2002',
            type: 'FUNGIBLE',
            amount: 100,
          },
        ],
      });
      expect(mirror.getPendingAirdrops).toHaveBeenCalledWith('0.0.1001');
    });

    test('throws when account cannot be resolved', async () => {
      const { service } = makeService({
        tokenReference: {
          resolveDestinationAccount: jest.fn().mockResolvedValue(null),
        },
      });

      await expect(
        service.getPendingAirdrops('missing', false, SupportedNetwork.TESTNET),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('TokenAssociationsServiceImpl', () => {
    const makeService = (
      overrides: {
        keyResolver?: Partial<jest.Mocked<KeyResolverService>>;
        txExecute?: Partial<jest.Mocked<TxExecuteService>>;
      } = {},
    ) => {
      const keyResolver = {
        resolveAccountCredentials: jest.fn().mockResolvedValue({
          accountId: '0.0.1001',
          keyRefId: 'account-key',
        }),
        ...overrides.keyResolver,
      } as unknown as jest.Mocked<KeyResolverService>;
      const token = {
        createTokenAssociationTransaction: jest
          .fn()
          .mockReturnValue(createMockTransaction()),
      } as unknown as jest.Mocked<TokenService>;
      const txSign = {
        sign: jest.fn().mockResolvedValue(createMockTransaction()),
      } as unknown as jest.Mocked<TxSignService>;
      const txExecute = {
        execute: jest.fn().mockResolvedValue({ success: true }),
        ...overrides.txExecute,
      } as unknown as jest.Mocked<TxExecuteService>;
      const logger = {
        info: jest.fn(),
        warn: jest.fn(),
      } as unknown as jest.Mocked<Logger>;
      const service = new TokenAssociationsServiceImpl(
        keyResolver,
        token,
        txSign,
        txExecute,
        logger,
      );

      return { service, keyResolver, token, txSign, txExecute, logger };
    };

    test('processes successful association transaction', async () => {
      const { service, token, txSign, txExecute } = makeService();

      await expect(
        service.processTokenAssociations(
          '0.0.2002',
          [{ rawValue: '0.0.1001' }] as Credential[],
          KeyManager.local,
        ),
      ).resolves.toEqual([{ name: '0.0.1001', accountId: '0.0.1001' }]);
      expect(token.createTokenAssociationTransaction).toHaveBeenCalledWith({
        tokenId: '0.0.2002',
        accountId: '0.0.1001',
      });
      expect(txSign.sign).toHaveBeenCalledWith(expect.anything(), [
        'account-key',
      ]);
      expect(txExecute.execute).toHaveBeenCalled();
    });

    test('returns only successful associations', async () => {
      const { service } = makeService({
        txExecute: {
          execute: jest.fn().mockResolvedValue({ success: false }),
        },
      });

      await expect(
        service.processTokenAssociations(
          '0.0.2002',
          [{ rawValue: '0.0.1001' }] as Credential[],
          KeyManager.local,
        ),
      ).resolves.toEqual([]);
    });
  });
});
