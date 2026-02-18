import type { AliasService, HederaMirrornodeService } from '@/core';
import type {
  AccountResolutionParams,
  ContractResolutionParams,
} from '@/core/services/identity-resolution/types';

import { StateError } from '@/core/errors';
import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { IdentityResolutionServiceImpl } from '@/core/services/identity-resolution/identity-resolution-service';
import {
  EntityReferenceType,
  SupportedNetwork,
} from '@/core/types/shared.types';

describe('IdentityResolutionServiceImpl', () => {
  let aliasService: jest.Mocked<AliasService>;
  let mirrorService: jest.Mocked<HederaMirrornodeService>;
  let service: IdentityResolutionServiceImpl;

  beforeEach(() => {
    aliasService = {
      register: jest.fn(),
      resolve: jest.fn(),
      resolveOrThrow: jest.fn(),
      list: jest.fn(),
      remove: jest.fn(),
      exists: jest.fn(),
      availableOrThrow: jest.fn(),
      clear: jest.fn(),
    } as unknown as jest.Mocked<AliasService>;

    mirrorService = {
      getAccount: jest.fn(),
      getAccountHBarBalance: jest.fn(),
      getAccountTokenBalances: jest.fn(),
      getTopicMessage: jest.fn(),
      getTopicMessages: jest.fn(),
      getTokenInfo: jest.fn(),
      getNftInfo: jest.fn(),
      getTopicInfo: jest.fn(),
      getTransactionRecord: jest.fn(),
      getContractInfo: jest.fn(),
      getPendingAirdrops: jest.fn(),
      getOutstandingAirdrops: jest.fn(),
      getExchangeRate: jest.fn(),
      postContractCall: jest.fn(),
    } as unknown as jest.Mocked<HederaMirrornodeService>;

    service = new IdentityResolutionServiceImpl(aliasService, mirrorService);
  });

  describe('resolveAccount', () => {
    it('resolves account via alias and returns mapped account info', async () => {
      (aliasService.resolveOrThrow as jest.Mock).mockReturnValue({
        entityId: '0.0.1234',
      });
      (mirrorService.getAccount as jest.Mock).mockResolvedValue({
        accountId: '0.0.1234',
        accountPublicKey: 'pub-key',
        evmAddress: '0xabc',
      });

      const params: AccountResolutionParams = {
        accountReference: 'alice',
        type: EntityReferenceType.ALIAS,
        network: SupportedNetwork.TESTNET,
      };

      const result = await service.resolveAccount(params);

      expect(aliasService.resolveOrThrow).toHaveBeenCalledWith(
        'alice',
        ALIAS_TYPE.Account,
        SupportedNetwork.TESTNET,
      );
      expect(mirrorService.getAccount).toHaveBeenCalledWith('0.0.1234');
      expect(result).toEqual({
        accountId: '0.0.1234',
        accountPublicKey: 'pub-key',
        evmAddress: '0xabc',
      });
    });

    it('resolves account when reference is an entity ID without alias lookup', async () => {
      (mirrorService.getAccount as jest.Mock).mockResolvedValue({
        accountId: '0.0.5678',
        accountPublicKey: 'pub-key-2',
        evmAddress: '0xdef',
      });

      const params: AccountResolutionParams = {
        accountReference: '0.0.5678',
        type: EntityReferenceType.ENTITY_ID,
        network: SupportedNetwork.TESTNET,
      };

      const result = await service.resolveAccount(params);

      expect(aliasService.resolveOrThrow).not.toHaveBeenCalled();
      expect(mirrorService.getAccount).toHaveBeenCalledWith('0.0.5678');
      expect(result).toEqual({
        accountId: '0.0.5678',
        accountPublicKey: 'pub-key-2',
        evmAddress: '0xdef',
      });
    });

    it('resolves account when reference is an EVM address without alias lookup', async () => {
      (mirrorService.getAccount as jest.Mock).mockResolvedValue({
        accountId: '0.0.9999',
        accountPublicKey: 'pub-key-3',
        evmAddress: '0x123',
      });

      const params: AccountResolutionParams = {
        accountReference: '0x123',
        type: EntityReferenceType.EVM_ADDRESS,
        network: SupportedNetwork.TESTNET,
      };

      const result = await service.resolveAccount(params);

      expect(aliasService.resolveOrThrow).not.toHaveBeenCalled();
      expect(mirrorService.getAccount).toHaveBeenCalledWith('0x123');
      expect(result).toEqual({
        accountId: '0.0.9999',
        accountPublicKey: 'pub-key-3',
        evmAddress: '0x123',
      });
    });
  });

  describe('resolveContract', () => {
    it('resolves contract via alias and returns mapped contract info', async () => {
      (aliasService.resolveOrThrow as jest.Mock).mockReturnValue({
        entityId: '0.0.4321',
      });
      (mirrorService.getContractInfo as jest.Mock).mockResolvedValue({
        contract_id: '0.0.4321',
        evm_address: '0xcontract',
      });

      const params: ContractResolutionParams = {
        contractReference: 'my-contract',
        type: EntityReferenceType.ALIAS,
        network: SupportedNetwork.TESTNET,
      };

      const result = await service.resolveContract(params);

      expect(aliasService.resolveOrThrow).toHaveBeenCalledWith(
        'my-contract',
        ALIAS_TYPE.Contract,
        SupportedNetwork.TESTNET,
      );
      expect(mirrorService.getContractInfo).toHaveBeenCalledWith('0.0.4321');
      expect(result).toEqual({
        contractId: '0.0.4321',
        evmAddress: '0xcontract',
      });
    });

    it('resolves contract when reference is an entity ID without alias lookup', async () => {
      (mirrorService.getContractInfo as jest.Mock).mockResolvedValue({
        contract_id: '0.0.7777',
        evm_address: '0x7777',
      });

      const params: ContractResolutionParams = {
        contractReference: '0.0.7777',
        type: EntityReferenceType.ENTITY_ID,
        network: SupportedNetwork.TESTNET,
      };

      const result = await service.resolveContract(params);

      expect(aliasService.resolveOrThrow).not.toHaveBeenCalled();
      expect(mirrorService.getContractInfo).toHaveBeenCalledWith('0.0.7777');
      expect(result).toEqual({
        contractId: '0.0.7777',
        evmAddress: '0x7777',
      });
    });

    it('resolves contract when reference is an EVM address without alias lookup', async () => {
      (mirrorService.getContractInfo as jest.Mock).mockResolvedValue({
        contract_id: '0.0.8888',
        evm_address: '0x8888',
      });

      const params: ContractResolutionParams = {
        contractReference: '0x8888',
        type: EntityReferenceType.EVM_ADDRESS,
        network: SupportedNetwork.TESTNET,
      };

      const result = await service.resolveContract(params);

      expect(aliasService.resolveOrThrow).not.toHaveBeenCalled();
      expect(mirrorService.getContractInfo).toHaveBeenCalledWith('0x8888');
      expect(result).toEqual({
        contractId: '0.0.8888',
        evmAddress: '0x8888',
      });
    });
  });

  describe('resolveReferenceToEntityOrEvmAddress', () => {
    it('returns entity ID from alias resolution when reference type is ALIAS', () => {
      (aliasService.resolveOrThrow as jest.Mock).mockReturnValue({
        entityId: '0.0.1357',
      });

      const result = service.resolveReferenceToEntityOrEvmAddress({
        entityReference: 'some-alias',
        referenceType: EntityReferenceType.ALIAS,
        network: SupportedNetwork.TESTNET,
        aliasType: ALIAS_TYPE.Account,
      });

      expect(aliasService.resolveOrThrow).toHaveBeenCalledWith(
        'some-alias',
        ALIAS_TYPE.Account,
        SupportedNetwork.TESTNET,
      );
      expect(result).toEqual({ entityIdOrEvmAddress: '0.0.1357' });
    });

    it('throws when alias resolution does not provide an entityId', () => {
      (aliasService.resolveOrThrow as jest.Mock).mockReturnValue({
        entityId: '',
      });

      expect(() => {
        service.resolveReferenceToEntityOrEvmAddress({
          entityReference: 'broken-alias',
          referenceType: EntityReferenceType.ALIAS,
          network: SupportedNetwork.TESTNET,
          aliasType: ALIAS_TYPE.Account,
        });
      }).toThrow(StateError);
    });

    it('returns the original reference when type is ENTITY_ID without alias lookup', () => {
      const result = service.resolveReferenceToEntityOrEvmAddress({
        entityReference: '0.0.2468',
        referenceType: EntityReferenceType.ENTITY_ID,
        network: SupportedNetwork.TESTNET,
        aliasType: ALIAS_TYPE.Account,
      });

      expect(aliasService.resolveOrThrow).not.toHaveBeenCalled();
      expect(result).toEqual({ entityIdOrEvmAddress: '0.0.2468' });
    });
  });
});
