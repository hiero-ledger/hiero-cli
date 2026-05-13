import type { IdentityResolutionService } from '@/core/services/identity-resolution/identity-resolution-service.interface';
import type { KeyResolverService } from '@/core/services/key-resolver/key-resolver-service.interface';
import type { Credential } from '@/core/services/kms/kms-types.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { TokenService } from '@/core/services/token/token-service.interface';
import type { TxExecuteService } from '@/core/services/tx-execute/tx-execute-service.interface';
import type { TxSignService } from '@/core/services/tx-sign/tx-sign-service.interface';
import type { TokenStateService } from '@/plugins/token/services/token-state.service.interface';

import { createMockTransaction } from '@/__tests__/mocks/hedera-sdk-mocks';
import { KeyManager } from '@/core/services/kms/kms-types.interface';
import {
  AliasType,
  EntityReferenceType,
  SupportedNetwork,
} from '@/core/types/shared.types';
import { TokenAssociationsServiceImpl } from '@/plugins/token/services/token-associations.service';
import { TokenKeysServiceImpl } from '@/plugins/token/services/token-keys.service';
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
      const state = {
        getToken: jest.fn(),
        addTokenAssociation: jest.fn(),
        removeTokenAssociation: jest.fn(),
      } as unknown as jest.Mocked<TokenStateService>;
      const logger = {
        info: jest.fn(),
        warn: jest.fn(),
      } as unknown as jest.Mocked<Logger>;
      const service = new TokenAssociationsServiceImpl(
        keyResolver,
        token,
        txSign,
        txExecute,
        state,
        logger,
      );

      return { service, keyResolver, token, txSign, txExecute, state, logger };
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
