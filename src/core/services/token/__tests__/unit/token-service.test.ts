/**
 * Unit tests for TokenServiceImpl
 * Tests token transfer, creation, and association transaction building
 */
import type { PublicKey } from '@hashgraph/sdk';
import type { Logger } from '@/core/services/logger/logger-service.interface';

import { AccountId, Hbar, TokenId, TokenType } from '@hashgraph/sdk';

import { ECDSA_HEX_PUBLIC_KEY } from '@/__tests__/mocks/fixtures';
import { makeLogger } from '@/__tests__/mocks/mocks';
import { TokenServiceImpl } from '@/core/services/token/token-service';
import { HederaTokenType } from '@/core/shared/constants';
import { SupplyType } from '@/core/types/shared.types';

import {
  createMockCustomFixedFee,
  createMockCustomFractionalFee,
  createMockTokenAssociateTransaction,
  createMockTokenCreateTransaction,
  createMockTransferTransaction,
} from './mocks';

// Reusable test constants
const ACCOUNT_ID_FROM = '0.0.1111';
const ACCOUNT_ID_TO = '0.0.2222';
const TREASURY_ACCOUNT_ID = '0.0.3333';
const FEE_COLLECTOR_ID = '0.0.4444';

const TOKEN_ID = '0.0.5555';
const TOKEN_NAME = 'TestToken';
const TOKEN_SYMBOL = 'TST';
const TOKEN_DECIMALS = 2;
const INITIAL_SUPPLY = 1000n;
const MAX_SUPPLY = 10000n;
const TOKEN_TYPE = HederaTokenType.FUNGIBLE_COMMON;

const TRANSFER_AMOUNT = 100n;

// Mock instances
const mockTransferTransaction = createMockTransferTransaction();
const mockTokenCreateTransaction = createMockTokenCreateTransaction();
const mockTokenAssociateTransaction = createMockTokenAssociateTransaction();
const mockCustomFixedFee = createMockCustomFixedFee();
const mockCustomFractionalFee = createMockCustomFractionalFee();

const mockTokenIdInstance = { toString: jest.fn().mockReturnValue(TOKEN_ID) };
const mockAccountIdInstance = {
  toString: jest.fn().mockReturnValue(TREASURY_ACCOUNT_ID),
};
const mockPublicKeyInstance = {
  toString: jest.fn().mockReturnValue(ECDSA_HEX_PUBLIC_KEY),
};
const mockPrivateKeyInstance = {
  publicKey: mockPublicKeyInstance,
};
const mockHbarInstance = { toString: jest.fn().mockReturnValue('1 ℏ') };

jest.mock('@hashgraph/sdk', () => ({
  TransferTransaction: jest.fn(() => mockTransferTransaction),
  TokenCreateTransaction: jest.fn(() => mockTokenCreateTransaction),
  TokenAssociateTransaction: jest.fn(() => mockTokenAssociateTransaction),
  CustomFixedFee: jest.fn(() => mockCustomFixedFee),
  CustomFractionalFee: jest.fn(() => mockCustomFractionalFee),
  FeeAssessmentMethod: {
    Inclusive: 'INCLUSIVE',
    Exclusive: 'EXCLUSIVE',
  },
  TokenId: {
    fromString: jest.fn(() => mockTokenIdInstance),
  },
  AccountId: {
    fromString: jest.fn(() => mockAccountIdInstance),
  },
  PublicKey: {
    fromString: jest.fn(() => mockPublicKeyInstance),
  },
  PrivateKey: {
    fromStringECDSA: jest.fn(() => mockPrivateKeyInstance),
    fromStringDer: jest.fn(() => mockPrivateKeyInstance),
  },
  TokenSupplyType: {
    Finite: 'FINITE',
    Infinite: 'INFINITE',
  },
  TokenType: {
    NonFungibleUnique: 'NON_FUNGIBLE_UNIQUE',
    FungibleCommon: 'FUNGIBLE_COMMON',
  },
  Hbar: {
    fromTinybars: jest.fn(() => mockHbarInstance),
  },
}));

describe('TokenServiceImpl', () => {
  let tokenService: TokenServiceImpl;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = makeLogger();
    tokenService = new TokenServiceImpl(logger);
  });

  describe('createTransferTransaction', () => {
    it('should create transfer transaction with correct parameters', () => {
      const params = {
        tokenId: TOKEN_ID,
        fromAccountId: ACCOUNT_ID_FROM,
        toAccountId: ACCOUNT_ID_TO,
        amount: TRANSFER_AMOUNT,
      };

      const result = tokenService.createTransferTransaction(params);

      expect(TokenId.fromString).toHaveBeenCalledWith(TOKEN_ID);
      expect(AccountId.fromString).toHaveBeenCalledWith(ACCOUNT_ID_FROM);
      expect(AccountId.fromString).toHaveBeenCalledWith(ACCOUNT_ID_TO);
      expect(mockTransferTransaction.addTokenTransfer).toHaveBeenCalledWith(
        mockTokenIdInstance,
        mockAccountIdInstance,
        -Number(TRANSFER_AMOUNT),
      );
      expect(mockTransferTransaction.addTokenTransfer).toHaveBeenCalledWith(
        mockTokenIdInstance,
        mockAccountIdInstance,
        Number(TRANSFER_AMOUNT),
      );
      expect(result).toBe(mockTransferTransaction);
    });

    it('should log debug messages during transfer creation', () => {
      const params = {
        tokenId: TOKEN_ID,
        fromAccountId: ACCOUNT_ID_FROM,
        toAccountId: ACCOUNT_ID_TO,
        amount: TRANSFER_AMOUNT,
      };

      tokenService.createTransferTransaction(params);

      expect(logger.debug).toHaveBeenCalledWith(
        `[TOKEN SERVICE] Creating transfer transaction: ${TRANSFER_AMOUNT} tokens from ${ACCOUNT_ID_FROM} to ${ACCOUNT_ID_TO}`,
      );
      expect(logger.debug).toHaveBeenCalledWith(
        `[TOKEN SERVICE] Created transfer transaction for token ${TOKEN_ID}`,
      );
    });

    it('should handle small transfer amounts', () => {
      const params = {
        tokenId: TOKEN_ID,
        fromAccountId: ACCOUNT_ID_FROM,
        toAccountId: ACCOUNT_ID_TO,
        amount: 1n,
      };

      tokenService.createTransferTransaction(params);

      expect(mockTransferTransaction.addTokenTransfer).toHaveBeenCalledWith(
        mockTokenIdInstance,
        mockAccountIdInstance,
        -1,
      );
      expect(mockTransferTransaction.addTokenTransfer).toHaveBeenCalledWith(
        mockTokenIdInstance,
        mockAccountIdInstance,
        1,
      );
    });

    it('should handle large transfer amounts', () => {
      const largeAmount = 1_000_000_000n;
      const params = {
        tokenId: TOKEN_ID,
        fromAccountId: ACCOUNT_ID_FROM,
        toAccountId: ACCOUNT_ID_TO,
        amount: largeAmount,
      };

      tokenService.createTransferTransaction(params);

      expect(mockTransferTransaction.addTokenTransfer).toHaveBeenCalledWith(
        mockTokenIdInstance,
        mockAccountIdInstance,
        -Number(largeAmount),
      );
      expect(mockTransferTransaction.addTokenTransfer).toHaveBeenCalledWith(
        mockTokenIdInstance,
        mockAccountIdInstance,
        Number(largeAmount),
      );
    });

    it('should handle different account IDs', () => {
      const params = {
        tokenId: TOKEN_ID,
        fromAccountId: '0.0.9999',
        toAccountId: '0.0.8888',
        amount: TRANSFER_AMOUNT,
      };

      tokenService.createTransferTransaction(params);

      expect(AccountId.fromString).toHaveBeenCalledWith('0.0.9999');
      expect(AccountId.fromString).toHaveBeenCalledWith('0.0.8888');
    });

    it('should handle different token IDs', () => {
      const differentTokenId = '0.0.7777';
      const params = {
        tokenId: differentTokenId,
        fromAccountId: ACCOUNT_ID_FROM,
        toAccountId: ACCOUNT_ID_TO,
        amount: TRANSFER_AMOUNT,
      };

      tokenService.createTransferTransaction(params);

      expect(TokenId.fromString).toHaveBeenCalledWith(differentTokenId);
    });

    it('should add negative amount for sender and positive for receiver', () => {
      const params = {
        tokenId: TOKEN_ID,
        fromAccountId: ACCOUNT_ID_FROM,
        toAccountId: ACCOUNT_ID_TO,
        amount: 500n,
      };

      tokenService.createTransferTransaction(params);

      const calls = mockTransferTransaction.addTokenTransfer.mock.calls;
      expect(calls[0][2]).toBe(-500); // Sender receives negative
      expect(calls[1][2]).toBe(500); // Receiver receives positive
    });
  });

  describe('createTokenTransaction', () => {
    const baseParams = {
      name: TOKEN_NAME,
      symbol: TOKEN_SYMBOL,
      treasuryId: TREASURY_ACCOUNT_ID,
      decimals: TOKEN_DECIMALS,
      initialSupplyRaw: INITIAL_SUPPLY,
      tokenType: TOKEN_TYPE,
      supplyType: SupplyType.INFINITE,
      adminPublicKey: mockPublicKeyInstance as unknown as PublicKey,
    };

    it('should create token with all required parameters', () => {
      const result = tokenService.createTokenTransaction(baseParams);

      expect(mockTokenCreateTransaction.setTokenName).toHaveBeenCalledWith(
        TOKEN_NAME,
      );
      expect(mockTokenCreateTransaction.setTokenSymbol).toHaveBeenCalledWith(
        TOKEN_SYMBOL,
      );
      expect(mockTokenCreateTransaction.setDecimals).toHaveBeenCalledWith(
        TOKEN_DECIMALS,
      );
      expect(mockTokenCreateTransaction.setInitialSupply).toHaveBeenCalledWith(
        INITIAL_SUPPLY,
      );
      expect(mockTokenCreateTransaction.setSupplyType).toHaveBeenCalledWith(
        SupplyType.INFINITE,
      );
      expect(mockTokenCreateTransaction.setTokenType).toHaveBeenCalledWith(
        TokenType.FungibleCommon,
      );
      expect(
        mockTokenCreateTransaction.setTreasuryAccountId,
      ).toHaveBeenCalledWith(mockAccountIdInstance);
      expect(mockTokenCreateTransaction.setAdminKey).toHaveBeenCalledWith(
        mockPublicKeyInstance,
      );
      expect(result).toBe(mockTokenCreateTransaction);
    });

    it('should create token with FINITE supply type and max supply', () => {
      const params = {
        ...baseParams,
        supplyType: SupplyType.FINITE,
        maxSupplyRaw: MAX_SUPPLY,
      };

      tokenService.createTokenTransaction(params);

      expect(mockTokenCreateTransaction.setSupplyType).toHaveBeenCalledWith(
        SupplyType.FINITE,
      );
      expect(mockTokenCreateTransaction.setMaxSupply).toHaveBeenCalledWith(
        MAX_SUPPLY,
      );
      expect(logger.debug).toHaveBeenCalledWith(
        `[TOKEN SERVICE] Set max supply to ${MAX_SUPPLY} for finite supply token`,
      );
    });

    it('should not set max supply for INFINITE supply type', () => {
      const params = {
        ...baseParams,
        supplyType: SupplyType.INFINITE,
      };

      tokenService.createTokenTransaction(params);

      expect(mockTokenCreateTransaction.setMaxSupply).not.toHaveBeenCalled();
    });

    it('should set memo when provided', () => {
      const memo = 'Test token memo';
      const params = {
        ...baseParams,
        memo,
      };

      tokenService.createTokenTransaction(params);

      expect(mockTokenCreateTransaction.setTokenMemo).toHaveBeenCalledWith(
        memo,
      );
      expect(logger.debug).toHaveBeenCalledWith(
        `[TOKEN SERVICE] Set token memo: ${memo}`,
      );
    });

    it('should not set memo when not provided', () => {
      tokenService.createTokenTransaction(baseParams);

      expect(mockTokenCreateTransaction.setTokenMemo).not.toHaveBeenCalled();
    });

    it('should set custom fees when provided', () => {
      const customFees = [
        {
          type: 'fixed' as const,
          amount: 100,
          collectorId: FEE_COLLECTOR_ID,
        },
      ];
      const params = {
        ...baseParams,
        customFees,
      };

      tokenService.createTokenTransaction(params);

      expect(Hbar.fromTinybars).toHaveBeenCalledWith(100);
      expect(mockCustomFixedFee.setHbarAmount).toHaveBeenCalledWith(
        mockHbarInstance,
      );
      expect(mockTokenCreateTransaction.setCustomFees).toHaveBeenCalledWith([
        mockCustomFixedFee,
      ]);
      expect(logger.debug).toHaveBeenCalledWith(
        '[TOKEN SERVICE] Set 1 custom fees',
      );
      expect(logger.debug).toHaveBeenCalledWith(
        '[TOKEN SERVICE] Added fixed HBAR fee: 100 tinybars',
      );
    });

    it('should not set custom fees when not provided', () => {
      tokenService.createTokenTransaction(baseParams);

      expect(mockTokenCreateTransaction.setCustomFees).not.toHaveBeenCalled();
    });

    it('should set fee collector when provided in custom fee', () => {
      const customFees = [
        {
          type: 'fixed' as const,
          amount: 100,
          collectorId: FEE_COLLECTOR_ID,
        },
      ];
      const params = {
        ...baseParams,
        customFees,
      };

      tokenService.createTokenTransaction(params);

      expect(mockCustomFixedFee.setFeeCollectorAccountId).toHaveBeenCalledWith(
        mockAccountIdInstance,
      );
    });

    it('should set exempt flag when provided in custom fee', () => {
      const customFees = [
        {
          type: 'fixed' as const,
          amount: 100,
          collectorId: FEE_COLLECTOR_ID,
          exempt: true,
        },
      ];
      const params = {
        ...baseParams,
        customFees,
      };

      tokenService.createTokenTransaction(params);

      expect(mockCustomFixedFee.setAllCollectorsAreExempt).toHaveBeenCalledWith(
        true,
      );
    });

    it('should handle multiple custom fees', () => {
      const customFees = [
        {
          type: 'fixed' as const,
          amount: 100,
          collectorId: FEE_COLLECTOR_ID,
        },
        {
          type: 'fixed' as const,
          amount: 200,
          collectorId: FEE_COLLECTOR_ID,
          exempt: true,
        },
      ];
      const params = {
        ...baseParams,
        customFees,
      };

      tokenService.createTokenTransaction(params);

      expect(mockTokenCreateTransaction.setCustomFees).toHaveBeenCalledWith([
        mockCustomFixedFee,
        mockCustomFixedFee,
      ]);
      expect(logger.debug).toHaveBeenCalledWith(
        '[TOKEN SERVICE] Set 2 custom fees',
      );
    });

    it('should handle zero decimals', () => {
      const params = {
        ...baseParams,
        decimals: 0,
      };

      tokenService.createTokenTransaction(params);

      expect(mockTokenCreateTransaction.setDecimals).toHaveBeenCalledWith(0);
    });

    it('should handle zero initial supply', () => {
      const params = {
        ...baseParams,
        initialSupplyRaw: 0n,
      };

      tokenService.createTokenTransaction(params);

      expect(mockTokenCreateTransaction.setInitialSupply).toHaveBeenCalledWith(
        0n,
      );
    });

    it('should log debug messages during token creation', () => {
      tokenService.createTokenTransaction(baseParams);

      expect(logger.debug).toHaveBeenCalledWith(
        `[TOKEN SERVICE] Creating token: ${TOKEN_NAME} (${TOKEN_SYMBOL})`,
      );
      expect(logger.debug).toHaveBeenCalledWith(
        `[TOKEN SERVICE] Created token creation transaction for ${TOKEN_NAME}`,
      );
    });

    it('should set fixed TOKEN fee with setDenominatingTokenToSameToken', () => {
      const customFees = [
        {
          type: 'fixed' as const,
          amount: 50,
          unitType: 'TOKEN' as const,
          collectorId: FEE_COLLECTOR_ID,
        },
      ];
      const params = { ...baseParams, customFees };

      tokenService.createTokenTransaction(params);

      expect(
        mockCustomFixedFee.setDenominatingTokenToSameToken,
      ).toHaveBeenCalled();
      expect(mockCustomFixedFee.setAmount).toHaveBeenCalledWith(50);
      expect(mockCustomFixedFee.setHbarAmount).not.toHaveBeenCalled();
    });

    it('should create fractional fee with numerator and denominator', () => {
      const customFees = [
        {
          type: 'fractional' as const,
          numerator: 1,
          denominator: 10,
          netOfTransfers: true,
          collectorId: FEE_COLLECTOR_ID,
        },
      ];
      const params = { ...baseParams, customFees };

      tokenService.createTokenTransaction(params);

      expect(mockCustomFractionalFee.setNumerator).toHaveBeenCalledWith(1);
      expect(mockCustomFractionalFee.setDenominator).toHaveBeenCalledWith(10);
      expect(mockCustomFractionalFee.setAssessmentMethod).toHaveBeenCalledWith(
        'INCLUSIVE',
      );
    });

    it('should set min and max for fractional fee when provided', () => {
      const customFees = [
        {
          type: 'fractional' as const,
          numerator: 1,
          denominator: 10,
          min: 10,
          max: 1000,
          netOfTransfers: false,
          collectorId: FEE_COLLECTOR_ID,
        },
      ];
      const params = { ...baseParams, customFees };

      tokenService.createTokenTransaction(params);

      expect(mockCustomFractionalFee.setMin).toHaveBeenCalledWith(10);
      expect(mockCustomFractionalFee.setMax).toHaveBeenCalledWith(1000);
      expect(mockCustomFractionalFee.setAssessmentMethod).toHaveBeenCalledWith(
        'EXCLUSIVE',
      );
    });

    it('should set exempt flag for fractional fee', () => {
      const customFees = [
        {
          type: 'fractional' as const,
          numerator: 1,
          denominator: 10,
          netOfTransfers: true,
          collectorId: FEE_COLLECTOR_ID,
          exempt: true,
        },
      ];
      const params = { ...baseParams, customFees };

      tokenService.createTokenTransaction(params);

      expect(
        mockCustomFractionalFee.setAllCollectorsAreExempt,
      ).toHaveBeenCalledWith(true);
    });
  });

  describe('createTokenAssociationTransaction', () => {
    it('should create association transaction with correct parameters', () => {
      const params = {
        tokenId: TOKEN_ID,
        accountId: ACCOUNT_ID_FROM,
      };

      const result = tokenService.createTokenAssociationTransaction(params);

      expect(TokenId.fromString).toHaveBeenCalledWith(TOKEN_ID);
      expect(AccountId.fromString).toHaveBeenCalledWith(ACCOUNT_ID_FROM);
      expect(mockTokenAssociateTransaction.setAccountId).toHaveBeenCalledWith(
        mockAccountIdInstance,
      );
      expect(mockTokenAssociateTransaction.setTokenIds).toHaveBeenCalledWith([
        mockTokenIdInstance,
      ]);
      expect(result).toBe(mockTokenAssociateTransaction);
    });

    it('should log debug messages during association creation', () => {
      const params = {
        tokenId: TOKEN_ID,
        accountId: ACCOUNT_ID_FROM,
      };

      tokenService.createTokenAssociationTransaction(params);

      expect(logger.debug).toHaveBeenCalledWith(
        `[TOKEN SERVICE] Creating association transaction: token ${TOKEN_ID} with account ${ACCOUNT_ID_FROM}`,
      );
      expect(logger.debug).toHaveBeenCalledWith(
        `[TOKEN SERVICE] Created association transaction for token ${TOKEN_ID}`,
      );
    });

    it('should handle different token and account IDs', () => {
      const params = {
        tokenId: '0.0.9999',
        accountId: '0.0.8888',
      };

      tokenService.createTokenAssociationTransaction(params);

      expect(TokenId.fromString).toHaveBeenCalledWith('0.0.9999');
      expect(AccountId.fromString).toHaveBeenCalledWith('0.0.8888');
    });
  });
});
