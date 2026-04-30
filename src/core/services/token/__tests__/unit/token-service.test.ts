/**
 * Unit tests for TokenServiceImpl
 * Tests token transfer, creation, and association transaction building
 */
import type { PublicKey } from '@hiero-ledger/sdk';
import type { Logger } from '@/core/services/logger/logger-service.interface';

import { AccountId, Hbar, TokenId, TokenType } from '@hiero-ledger/sdk';

import {
  ECDSA_HEX_PUBLIC_KEY,
  MOCK_ACCOUNT_ID,
} from '@/__tests__/mocks/fixtures';
import { makeLogger } from '@/__tests__/mocks/mocks';
import { TokenServiceImpl } from '@/core/services/token/token-service';
import { DAY_IN_SECONDS, HederaTokenType } from '@/core/shared/constants';
import { SupplyType } from '@/core/types/shared.types';
import {
  type CustomFee,
  CustomFeeType,
  FixedFeeUnitType,
} from '@/core/types/token.types';

import {
  createMockCustomFixedFee,
  createMockCustomFractionalFee,
  createMockTokenAssociateTransaction,
  createMockTokenCreateTransaction,
  createMockTokenDeleteTransaction,
  createMockTokenDissociateTransaction,
} from './mocks';

// Reusable test constants
const ACCOUNT_ID_FROM = '0.0.1111';
const TREASURY_ACCOUNT_ID = '0.0.3333';
const FEE_COLLECTOR_ID = '0.0.4444';

const TOKEN_ID = '0.0.5555';
const TOKEN_NAME = 'TestToken';
const TOKEN_SYMBOL = 'TST';
const TOKEN_DECIMALS = 2;
const INITIAL_SUPPLY = 1000n;
const MAX_SUPPLY = 10000n;
const TOKEN_TYPE = HederaTokenType.FUNGIBLE_COMMON;

// Mock instances
const mockTokenCreateTransaction = createMockTokenCreateTransaction();
const mockTokenAssociateTransaction = createMockTokenAssociateTransaction();
const mockTokenDissociateTransaction = createMockTokenDissociateTransaction();
const mockTokenDeleteTransaction = createMockTokenDeleteTransaction();
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

jest.mock('@hiero-ledger/sdk', () => ({
  TokenCreateTransaction: jest.fn(() => mockTokenCreateTransaction),
  TokenAssociateTransaction: jest.fn(() => mockTokenAssociateTransaction),
  TokenDissociateTransaction: jest.fn(() => mockTokenDissociateTransaction),
  TokenDeleteTransaction: jest.fn(() => mockTokenDeleteTransaction),
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

  describe('createTokenTransaction', () => {
    const baseParams = {
      name: TOKEN_NAME,
      symbol: TOKEN_SYMBOL,
      treasuryId: TREASURY_ACCOUNT_ID,
      decimals: TOKEN_DECIMALS,
      initialSupplyRaw: INITIAL_SUPPLY,
      tokenType: TOKEN_TYPE,
      supplyType: SupplyType.INFINITE,
      adminKey: mockPublicKeyInstance as unknown as PublicKey,
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

    it('should not set freeze key or freeze default when freeze key omitted', () => {
      tokenService.createTokenTransaction(baseParams);

      expect(mockTokenCreateTransaction.setFreezeKey).not.toHaveBeenCalled();
      expect(
        mockTokenCreateTransaction.setFreezeDefault,
      ).not.toHaveBeenCalled();
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

    it('should not set admin key when omitted', () => {
      const { adminKey: _admin, ...paramsWithoutAdmin } = baseParams;

      tokenService.createTokenTransaction(paramsWithoutAdmin);

      expect(mockTokenCreateTransaction.setAdminKey).not.toHaveBeenCalled();
    });

    it('should set metadata key when provided', () => {
      const params = {
        ...baseParams,
        metadataKey: mockPublicKeyInstance as unknown as PublicKey,
      };

      tokenService.createTokenTransaction(params);

      expect(mockTokenCreateTransaction.setMetadataKey).toHaveBeenCalledWith(
        mockPublicKeyInstance,
      );
    });

    it('should set freeze default when freeze key is set', () => {
      const paramsWithFreeze = {
        ...baseParams,
        freezeKey: mockPublicKeyInstance as unknown as PublicKey,
        freezeDefault: true,
      };

      tokenService.createTokenTransaction(paramsWithFreeze);

      expect(mockTokenCreateTransaction.setFreezeKey).toHaveBeenCalledWith(
        mockPublicKeyInstance,
      );
      expect(mockTokenCreateTransaction.setFreezeDefault).toHaveBeenCalledWith(
        true,
      );
    });

    it('should set freeze default false when freeze key is set without freezeDefault', () => {
      const paramsWithFreeze = {
        ...baseParams,
        freezeKey: mockPublicKeyInstance as unknown as PublicKey,
      };

      tokenService.createTokenTransaction(paramsWithFreeze);

      expect(mockTokenCreateTransaction.setFreezeDefault).toHaveBeenCalledWith(
        false,
      );
    });

    it('should set custom fees when provided', () => {
      const customFees: CustomFee[] = [
        {
          type: CustomFeeType.FIXED,
          amount: 100,
          unitType: FixedFeeUnitType.HBAR,
          collectorId: FEE_COLLECTOR_ID,
          exempt: false,
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
      const customFees: CustomFee[] = [
        {
          type: CustomFeeType.FIXED,
          amount: 100,
          unitType: FixedFeeUnitType.HBAR,
          collectorId: FEE_COLLECTOR_ID,
          exempt: false,
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
      const customFees: CustomFee[] = [
        {
          type: CustomFeeType.FIXED,
          amount: 100,
          unitType: FixedFeeUnitType.HBAR,
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
      const customFees: CustomFee[] = [
        {
          type: CustomFeeType.FIXED,
          amount: 100,
          unitType: FixedFeeUnitType.HBAR,
          collectorId: FEE_COLLECTOR_ID,
          exempt: false,
        },
        {
          type: CustomFeeType.FIXED,
          amount: 200,
          unitType: FixedFeeUnitType.HBAR,
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
      const customFees: CustomFee[] = [
        {
          type: CustomFeeType.FIXED,
          amount: 50,
          unitType: FixedFeeUnitType.TOKEN,
          collectorId: FEE_COLLECTOR_ID,
          exempt: false,
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
      const customFees: CustomFee[] = [
        {
          type: CustomFeeType.FRACTIONAL,
          numerator: 1,
          denominator: 10,
          netOfTransfers: true,
          collectorId: FEE_COLLECTOR_ID,
          exempt: false,
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
      const customFees: CustomFee[] = [
        {
          type: CustomFeeType.FRACTIONAL,
          numerator: 1,
          denominator: 10,
          min: 10,
          max: 1000,
          netOfTransfers: false,
          collectorId: FEE_COLLECTOR_ID,
          exempt: false,
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
      const customFees: CustomFee[] = [
        {
          type: CustomFeeType.FRACTIONAL,
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

    it('should set auto-renew account and period when both provided', () => {
      const params = {
        ...baseParams,
        autoRenewAccountId: MOCK_ACCOUNT_ID,
        autoRenewPeriodSeconds: 30 * DAY_IN_SECONDS,
      };

      tokenService.createTokenTransaction(params);

      expect(
        mockTokenCreateTransaction.setAutoRenewAccountId,
      ).toHaveBeenCalledWith(mockAccountIdInstance);
      expect(
        mockTokenCreateTransaction.setAutoRenewPeriod,
      ).toHaveBeenCalledWith(30 * DAY_IN_SECONDS);
      expect(
        mockTokenCreateTransaction.setExpirationTime,
      ).not.toHaveBeenCalled();
    });

    it('should set expiration time when auto-renew period is not used', () => {
      const exp = new Date('2028-01-01T00:00:00.000Z');
      const params = {
        ...baseParams,
        expirationTime: exp,
      };

      tokenService.createTokenTransaction(params);

      expect(mockTokenCreateTransaction.setExpirationTime).toHaveBeenCalledWith(
        exp,
      );
      expect(
        mockTokenCreateTransaction.setAutoRenewPeriod,
      ).not.toHaveBeenCalled();
    });

    it('should prefer auto-renew over expiration when both are passed', () => {
      const params = {
        ...baseParams,
        autoRenewAccountId: MOCK_ACCOUNT_ID,
        autoRenewPeriodSeconds: 30 * DAY_IN_SECONDS,
        expirationTime: new Date('2028-01-01T00:00:00.000Z'),
      };

      tokenService.createTokenTransaction(params);

      expect(
        mockTokenCreateTransaction.setAutoRenewPeriod,
      ).toHaveBeenCalledWith(30 * DAY_IN_SECONDS);
      expect(
        mockTokenCreateTransaction.setExpirationTime,
      ).not.toHaveBeenCalled();
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

  describe('createTokenDissociationTransaction', () => {
    it('should create dissociation transaction with correct parameters', () => {
      const params = {
        tokenId: TOKEN_ID,
        accountId: ACCOUNT_ID_FROM,
      };

      const result = tokenService.createTokenDissociationTransaction(params);

      expect(TokenId.fromString).toHaveBeenCalledWith(TOKEN_ID);
      expect(AccountId.fromString).toHaveBeenCalledWith(ACCOUNT_ID_FROM);
      expect(mockTokenDissociateTransaction.setAccountId).toHaveBeenCalledWith(
        mockAccountIdInstance,
      );
      expect(mockTokenDissociateTransaction.setTokenIds).toHaveBeenCalledWith([
        mockTokenIdInstance,
      ]);
      expect(result).toBe(mockTokenDissociateTransaction);
    });

    it('should log debug messages during dissociation creation', () => {
      const params = {
        tokenId: TOKEN_ID,
        accountId: ACCOUNT_ID_FROM,
      };

      tokenService.createTokenDissociationTransaction(params);

      expect(logger.debug).toHaveBeenCalledWith(
        `[TOKEN SERVICE] Creating dissociation transaction: token ${TOKEN_ID} from account ${ACCOUNT_ID_FROM}`,
      );
      expect(logger.debug).toHaveBeenCalledWith(
        `[TOKEN SERVICE] Created dissociation transaction for token ${TOKEN_ID}`,
      );
    });
  });

  describe('createDeleteTransaction', () => {
    it('should create delete transaction with correct tokenId', () => {
      const params = { tokenId: TOKEN_ID };

      const result = tokenService.createDeleteTransaction(params);

      expect(TokenId.fromString).toHaveBeenCalledWith(TOKEN_ID);
      expect(mockTokenDeleteTransaction.setTokenId).toHaveBeenCalledWith(
        mockTokenIdInstance,
      );
      expect(result).toBe(mockTokenDeleteTransaction);
    });

    it('should log debug messages during delete transaction creation', () => {
      tokenService.createDeleteTransaction({ tokenId: TOKEN_ID });

      expect(logger.debug).toHaveBeenCalledWith(
        `[TOKEN SERVICE] Creating delete transaction for token ${TOKEN_ID}`,
      );
    });
  });
});
