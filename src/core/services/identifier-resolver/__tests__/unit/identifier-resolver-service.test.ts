/**
 * Unit tests for IdentifierResolverServiceImpl
 * Tests entity ID resolution from raw ID or alias
 */
import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { ResolveEntityParams } from '@/core/services/identifier-resolver/types';

import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { IdentifierResolverServiceImpl } from '@/core/services/identifier-resolver/identifier-resolver-service';
import { SupportedNetwork } from '@/core/types/shared.types';

describe('IdentifierResolverServiceImpl', () => {
  let service: IdentifierResolverServiceImpl;
  let aliasService: jest.Mocked<AliasService>;

  const baseParams: ResolveEntityParams = {
    entityIdOrAlias: 'my-contract-alias',
    type: ALIAS_TYPE.Contract,
    network: SupportedNetwork.TESTNET,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    aliasService = {
      resolve: jest.fn(),
    } as unknown as jest.Mocked<AliasService>;
    service = new IdentifierResolverServiceImpl(aliasService);
  });

  describe('resolveEntityId', () => {
    it('returns entityId when entityIdOrAlias is a valid Hedera entity ID', () => {
      const result = service.resolveEntityId({
        ...baseParams,
        entityIdOrAlias: '0.0.1234',
      });

      expect(result).toEqual({ entityId: '0.0.1234' });
      expect(aliasService.resolve).not.toHaveBeenCalled();
    });

    it('returns entityId for another valid entity ID format', () => {
      const result = service.resolveEntityId({
        ...baseParams,
        entityIdOrAlias: '0.0.999999',
      });

      expect(result).toEqual({ entityId: '0.0.999999' });
      expect(aliasService.resolve).not.toHaveBeenCalled();
    });

    it('resolves via alias when entityIdOrAlias is not a valid entity ID', () => {
      aliasService.resolve.mockReturnValue({
        alias: 'my-contract-alias',
        type: ALIAS_TYPE.Contract,
        network: SupportedNetwork.TESTNET,
        entityId: '0.0.5678',
        createdAt: '2024-01-01T00:00:00.000Z',
      });

      const result = service.resolveEntityId(baseParams);

      expect(result).toEqual({ entityId: '0.0.5678' });
      expect(aliasService.resolve).toHaveBeenCalledTimes(1);
      expect(aliasService.resolve).toHaveBeenCalledWith(
        'my-contract-alias',
        ALIAS_TYPE.Contract,
        SupportedNetwork.TESTNET,
      );
    });

    it('throws when alias is not found', () => {
      aliasService.resolve.mockReturnValue(null);

      expect(() => service.resolveEntityId(baseParams)).toThrow(
        'Alias "my-contract-alias" not found for network testnet. Please provide either a valid contract alias or contract ID.',
      );
      expect(aliasService.resolve).toHaveBeenCalledWith(
        'my-contract-alias',
        ALIAS_TYPE.Contract,
        SupportedNetwork.TESTNET,
      );
    });

    it('throws when alias record has no entityId', () => {
      aliasService.resolve.mockReturnValue({
        alias: 'my-contract-alias',
        type: ALIAS_TYPE.Contract,
        network: SupportedNetwork.TESTNET,
        createdAt: '2024-01-01T00:00:00.000Z',
      });

      expect(() => service.resolveEntityId(baseParams)).toThrow(
        'Alias "my-contract-alias" for type contract does not have an associated entity ID.',
      );
    });

    it('does not accept invalid entity ID format (0.0.0)', () => {
      aliasService.resolve.mockReturnValue({
        alias: '0.0.0',
        type: ALIAS_TYPE.Contract,
        network: SupportedNetwork.TESTNET,
        entityId: '0.0.1234',
        createdAt: '2024-01-01T00:00:00.000Z',
      });

      const result = service.resolveEntityId({
        ...baseParams,
        entityIdOrAlias: '0.0.0',
      });

      expect(aliasService.resolve).toHaveBeenCalledWith(
        '0.0.0',
        ALIAS_TYPE.Contract,
        SupportedNetwork.TESTNET,
      );
      expect(result).toEqual({ entityId: '0.0.1234' });
    });

    it('passes correct type and network to alias.resolve', () => {
      aliasService.resolve.mockReturnValue({
        alias: 'treasury',
        type: ALIAS_TYPE.Account,
        network: SupportedNetwork.MAINNET,
        entityId: '0.0.100',
        createdAt: '2024-01-01T00:00:00.000Z',
      });

      service.resolveEntityId({
        entityIdOrAlias: 'treasury',
        type: ALIAS_TYPE.Account,
        network: SupportedNetwork.MAINNET,
      });

      expect(aliasService.resolve).toHaveBeenCalledWith(
        'treasury',
        ALIAS_TYPE.Account,
        SupportedNetwork.MAINNET,
      );
    });
  });
});
