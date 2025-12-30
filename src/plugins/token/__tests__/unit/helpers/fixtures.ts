/**
 * Test Fixtures for Token Plugin Tests
 * Reusable test data and constants
 */

/**
 * Mock Account IDs
 */
export const mockAccountIds = {
  treasury: '0.0.123456',
  operator: '0.0.100000',
  association: '0.0.789012',
  collector: '0.0.999999',
  receiver: '0.0.555555',
};

/**
 * Mock Keys (private keys for testing - DER format)
 * Format: 302e020100300506032b6570042204 + unique padding (min 100 hex total)
 */
export const mockKeys = {
  treasury:
    '302e020100300506032b65700422042011111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111',
  admin:
    '302e020100300506032b65700422042022222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222',
  supply:
    '302e020100300506032b65700422042033333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333',
  wipe: '302e020100300506032b65700422042044444444444444444444444444444444444444444444444444444444444444444444444444444444444444444444444444444444444444444444444444444444',
  kyc: '302e020100300506032b65700422042055555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555555',
  freeze:
    '302e020100300506032b65700422042066666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666666',
  pause:
    '302e020100300506032b65700422042077777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777',
  feeSchedule:
    '302e020100300506032b65700422042088888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888',
  association:
    '302e020100300506032b65700422042099999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999',
  operator:
    '302e020100300506032b657004220420aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
};

/**
 * Mock Account Key Pairs (accountId:privateKey format for new schema validation)
 */
export const mockAccountKeyPairs = {
  treasury: `${mockAccountIds.treasury}:${mockKeys.treasury}`,
  admin: `${mockAccountIds.operator}:${mockKeys.admin}`,
  supply: `${mockAccountIds.operator}:${mockKeys.supply}`,
  wipe: `${mockAccountIds.operator}:${mockKeys.wipe}`,
  kyc: `${mockAccountIds.operator}:${mockKeys.kyc}`,
  freeze: `${mockAccountIds.operator}:${mockKeys.freeze}`,
  pause: `${mockAccountIds.operator}:${mockKeys.pause}`,
  feeSchedule: `${mockAccountIds.operator}:${mockKeys.feeSchedule}`,
  association: `${mockAccountIds.association}:${mockKeys.association}`,
  operator: `${mockAccountIds.operator}:${mockKeys.operator}`,
};

/**
 * Mock Credentials
 */
export const mockCredentials = {
  testnet: {
    accountId: mockAccountIds.operator,
    privateKey: mockKeys.operator,
    network: 'testnet' as const,
    isDefault: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  mainnet: {
    accountId: mockAccountIds.operator,
    privateKey: mockKeys.operator,
    network: 'mainnet' as const,
    isDefault: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
};

/**
 * Valid Token File Data
 */
export const validTokenFile = {
  name: 'TestToken',
  symbol: 'TEST',
  decimals: 2,
  supplyType: 'finite' as const,
  initialSupply: 1000,
  maxSupply: 10000,
  treasuryKey: `${mockAccountIds.treasury}:${mockKeys.treasury}`,
  adminKey: `${mockAccountIds.operator}:${mockKeys.admin}`,
  associations: [`${mockAccountIds.association}:${mockKeys.association}`],
  customFees: [
    {
      type: 'fixed' as const,
      amount: 10,
      unitType: 'HBAR' as const,
      collectorId: mockAccountIds.collector,
    },
  ],
  memo: 'Test token created from file',
};

/**
 * Valid Token Creation Parameters
 */
export const validTokenParams = {
  name: 'TestToken',
  symbol: 'TEST',
  decimals: 2,
  initialSupply: 1000,
  supplyType: 'FINITE' as const,
  maxSupply: 10000,
  treasuryId: mockAccountIds.treasury,
  adminKey: mockKeys.admin,
  treasuryKey: mockKeys.treasury,
};

/**
 * Infinite Supply Token File
 */
export const infiniteSupplyTokenFile = {
  ...validTokenFile,
  supplyType: 'infinite' as const,
  maxSupply: 0,
};

/**
 * Invalid Token File - Missing Name
 */
export const invalidTokenFileMissingName = {
  symbol: 'TEST',
  decimals: 2,
  supplyType: 'finite' as const,
  initialSupply: 1000,
  treasuryKey: `${mockAccountIds.treasury}:${mockKeys.treasury}`,
  adminKey: `${mockAccountIds.operator}:${mockKeys.admin}`,
};

/**
 * Invalid Token File - Invalid Treasury Format
 */
export const invalidTokenFileInvalidTreasury = {
  ...validTokenFile,
  treasuryKey: '', // Empty treasury string
};

/**
 * Invalid Token File - Invalid Supply Type
 */
export const invalidTokenFileInvalidSupplyType = {
  ...validTokenFile,
  supplyType: 'invalid-type',
};

/**
 * Invalid Token File - Negative Initial Supply
 */
export const invalidTokenFileNegativeSupply = {
  ...validTokenFile,
  initialSupply: -100,
};

/**
 * Mock Transaction Results
 */
export const mockTransactionResults = {
  success: {
    success: true,
    transactionId: '0.0.123@1234567890.123456789',
    consensusTimestamp: '2024-01-01T00:00:00.000Z',
    tokenId: '0.0.123456',
    receipt: {
      status: {
        status: 'success',
        transactionId: '0.0.123@1234567890.123456789',
      },
    },
  },
  successWithAssociation: {
    success: true,
    transactionId: '0.0.123@1234567890.123456790',
    consensusTimestamp: '2024-01-01T00:00:00.000Z',
    receipt: {
      status: {
        status: 'success',
        transactionId: '0.0.123@1234567890.123456790',
      },
    },
  },
  failure: {
    success: false,
    transactionId: '',
    consensusTimestamp: '2024-01-01T00:00:00.000Z',
    receipt: {
      status: {
        status: 'failed',
        transactionId: '',
      },
    },
  },
};

/**
 * Mock Token Data (stored in state)
 */
export const mockTokenData = {
  basic: {
    tokenId: '0.0.123456',
    name: 'TestToken',
    symbol: 'TEST',
    decimals: 2,
    totalSupply: 1000,
    treasury: mockAccountIds.treasury,
    adminKey: mockKeys.admin,
    supplyKey: mockKeys.supply,
    network: 'testnet' as const,
    customFees: [],
  },
  withFees: {
    tokenId: '0.0.123456',
    name: 'TestToken',
    symbol: 'TEST',
    decimals: 2,
    totalSupply: 1000,
    treasury: mockAccountIds.treasury,
    adminKey: mockKeys.admin,
    supplyKey: mockKeys.supply,
    network: 'testnet' as const,
    customFees: [
      {
        feeCollectorAccountId: mockAccountIds.collector,
        hbarAmount: { _valueInTinybar: 10 },
      },
    ],
  },
};

/**
 * Mock File Paths
 */
export const mockFilePaths = {
  valid: '/path/to/token.test.json',
  resolved: '/resolved/path/to/token.test.json',
  nonexistent: '/path/to/nonexistent.json',
};

/**
 * Mock Transaction Objects
 */
export const mockTransactions = {
  token: { test: 'token-transaction' },
  association: { test: 'association-transaction' },
  transfer: { test: 'transfer-transaction' },
};

/**
 * Schema Test Data - Valid Token Data
 */
export const validTokenDataForSchema = {
  tokenId: '0.0.123456',
  name: 'TestToken',
  symbol: 'TEST',
  decimals: 2,
  initialSupply: 1000n,
  supplyType: 'FINITE' as const,
  maxSupply: 10000n,
  treasuryId: '0.0.789012',
  associations: [
    {
      name: 'TestAccount',
      accountId: '0.0.345678',
    },
  ],
  adminPublicKey: 'admin-key',
  network: 'testnet' as const,
  customFees: [
    {
      type: 'fixed' as const,
      amount: 10,
      unitType: 'HBAR' as const,
      collectorId: '0.0.999999',
    },
  ],
};

/**
 * Schema Test Data - Valid Token Keys
 */
export const validTokenKeys = {
  adminKey: 'admin-key',
  supplyKey: 'supply-key',
  wipeKey: 'wipe-key',
  kycKey: 'kyc-key',
  freezeKey: 'freeze-key',
  pauseKey: 'pause-key',
  feeScheduleKey: 'fee-schedule-key',
  treasuryKey: 'treasury-key',
};

/**
 * Schema Test Data - Valid Token Association
 */
export const validTokenAssociation = {
  name: 'TestAccount',
  accountId: '0.0.345678',
};

/**
 * Schema Test Data - Valid Custom Fee
 */
export const validCustomFee = {
  type: 'fixed' as const,
  amount: 10,
  unitType: 'HBAR' as const,
  collectorId: '0.0.999999',
  exempt: false,
};

/**
 * Schema Test Data - Valid Token Create Parameters
 */
export const validTokenCreateParams = {
  tokenName: 'TestToken',
  symbol: 'TEST',
  decimals: 2,
  initialSupply: '1000',
  supplyType: 'INFINITE' as const,
  treasury: 'treasury-account', // Use alias
  adminKey: 'admin-account', // Use alias
};

/**
 * Schema Test Data - Minimal Valid Create Parameters
 */
export const minimalTokenCreateParams = {
  tokenName: 'TestToken',
  symbol: 'TEST',
};

/**
 * Plugin Manifest Expectations
 */
export const expectedPluginManifest = {
  name: 'token',
  version: '1.0.0',
  displayName: 'Token Plugin',
  expectedCommands: ['create', 'associate', 'transfer', 'create-from-file'],
};

/**
 * State Management Test Data - Mock Token Data
 */
export const mockStateTokenData = {
  basic: {
    tokenId: '0.0.123456',
    name: 'TestToken',
    symbol: 'TEST',
    decimals: 2,
    initialSupply: 1000n,
    supplyType: 'FINITE' as const,
    maxSupply: 10000n,
    treasuryId: '0.0.789012',
    adminPublicKey: 'admin-key',
    network: 'testnet' as const,
    associations: [],
    customFees: [],
  },
  withAssociations: {
    tokenId: '0.0.123456',
    name: 'TestToken',
    symbol: 'TEST',
    decimals: 2,
    initialSupply: 1000n,
    supplyType: 'FINITE' as const,
    maxSupply: 10000n,
    treasuryId: '0.0.789012',
    adminPublicKey: 'admin-key',
    network: 'testnet' as const,
    associations: [{ name: 'TestAccount', accountId: '0.0.111111' }],
    customFees: [],
  },
  token2: {
    tokenId: '0.0.789012',
    name: 'TestToken2',
    symbol: 'TEST2',
    decimals: 8,
    initialSupply: 5000n,
    supplyType: 'INFINITE' as const,
    maxSupply: 0n,
    treasuryId: '0.0.111111',
    adminPublicKey: 'admin-key2',
    network: 'testnet' as const,
    associations: [],
    customFees: [],
  },
};

/**
 * State Management Test Data - Multiple Tokens for getAllTokens tests
 */
export const mockMultipleTokens = {
  '0.0.123456': mockStateTokenData.basic,
  '0.0.789012': mockStateTokenData.token2,
};

/**
 * Factory function to create CommandHandlerArgs for token create tests
 */
export const makeTokenCreateCommandArgs = (params: {
  api: any;
  logger: any;
  args?: Record<string, any>;
}) => ({
  args: {
    tokenName: 'TestToken',
    symbol: 'TEST',
    decimals: 2,
    initialSupply: '1000',
    supplyType: 'INFINITE',
    treasury: 'treasury-account', // Use alias
    adminKey: 'test-admin-key', // Use alias
    ...params.args,
  },
  api: params.api,
  state: {} as any,
  config: {} as any,
  logger: params.logger,
});

/**
 * Expected token transaction parameters for create tests
 */
export const expectedTokenTransactionParams = {
  name: 'TestToken',
  symbol: 'TEST',
  decimals: 2,
  initialSupplyRaw: 100000n,
  supplyType: 'INFINITE',
  maxSupplyRaw: undefined,
  treasuryId: '0.0.123456',
  adminPublicKey: expect.any(Object),
  memo: undefined,
};

/**
 * Expected token transaction parameters for createFromFile tests
 */
export const expectedTokenTransactionParamsFromFile = {
  name: 'TestToken',
  symbol: 'TEST',
  decimals: 2,
  initialSupplyRaw: 1000n,
  supplyType: 'FINITE',
  maxSupplyRaw: 10000n,
  treasuryId: '0.0.123456',
  adminPublicKey: expect.any(Object), // PublicKey object from keyResolver
  customFees: [
    {
      type: 'fixed',
      amount: 10,
      unitType: 'HBAR',
      collectorId: '0.0.999999',
      exempt: undefined,
    },
  ],
  memo: 'Test token created from file',
};

/**
 * Valid data for validateTokenData tests
 */
export const validTokenDataForValidation = {
  tokenId: '0.0.123456',
  name: 'TestToken',
  symbol: 'TEST',
  decimals: 2,
  initialSupply: 1000,
  supplyType: 'FINITE' as const,
  maxSupply: 10000,
  treasuryId: '0.0.789012',
  associations: [],
  adminPublicKey: 'admin-key',
  network: 'testnet' as const,
  customFees: [],
};

/**
 * Invalid data for validateTokenData tests
 */
export const invalidTokenDataForValidation = {
  tokenId: 'invalid-id',
  name: 'TestToken',
  symbol: 'TEST',
};

/**
 * Factory function to create TokenData for list tests
 * Provides sensible defaults with override support
 */
export const makeTokenData = (
  overrides: Partial<{
    tokenId: string;
    name: string;
    symbol: string;
    treasuryId: string;
    decimals: number;
    initialSupply: number;
    supplyType: 'FINITE' | 'INFINITE';
    maxSupply: number;
    adminPublicKey?: string;
    network: 'mainnet' | 'testnet' | 'previewnet' | 'localnet';
    associations: Array<{ name: string; accountId: string }>;
    customFees: any[];
  }> = {},
) => ({
  tokenId: '0.0.1234',
  name: 'Test Token',
  symbol: 'TST',
  treasuryId: '0.0.5678',
  decimals: 2,
  initialSupply: 1000000,
  supplyType: 'INFINITE' as const,
  maxSupply: 0,
  adminPublicKey: 'test-admin-key',
  network: 'testnet' as const,
  associations: [],
  customFees: [],
  ...overrides,
});

export const tokenAssociatedWithAccountFixture = makeTokenData({
  tokenId: '0.0.123456',
  name: 'TestToken',
  symbol: 'TEST',
  associations: [
    {
      name: '0.0.789012',
      accountId: '0.0.789012',
    },
  ],
});

export const tokenAssociatedWithAliasFixture = makeTokenData({
  tokenId: '0.0.123456',
  name: 'TestToken',
  symbol: 'TEST',
  associations: [
    {
      name: 'my-account-alias',
      accountId: '0.0.789012',
    },
  ],
});

export const tokenWithoutAssociationsFixture = makeTokenData({
  tokenId: '0.0.123456',
  name: 'TestToken',
  symbol: 'TEST',
  associations: [],
});

/**
 * Factory function to create token statistics for list tests
 */
export const makeTokenStats = (
  overrides: Partial<{
    total: number;
    byNetwork: Record<string, number>;
    bySupplyType: Record<string, number>;
    withAssociations: number;
    totalAssociations: number;
    withKeys: number;
  }> = {},
) => ({
  total: 0,
  byNetwork: {},
  bySupplyType: {},
  withAssociations: 0,
  totalAssociations: 0,
  withKeys: 0,
  ...overrides,
});

/**
 * Pre-configured token list fixtures for common scenarios
 */
export const mockListTokens = {
  empty: [],
  twoTokens: [
    makeTokenData({
      tokenId: '0.0.1111',
      name: 'Token 1',
      symbol: 'TK1',
      network: 'testnet',
    }),
    makeTokenData({
      tokenId: '0.0.2222',
      name: 'Token 2',
      symbol: 'TK2',
      network: 'testnet',
    }),
  ],
  withKeys: [
    makeTokenData({
      tokenId: '0.0.3333',
      name: 'Token 3',
      symbol: 'TK3',
      network: 'testnet',
      adminPublicKey: 'admin-key-123',
    }),
  ],
  multiNetwork: [
    makeTokenData({
      tokenId: '0.0.4444',
      name: 'Testnet Token',
      symbol: 'TST',
      network: 'testnet',
    }),
    makeTokenData({
      tokenId: '0.0.5555',
      name: 'Mainnet Token',
      symbol: 'MNT',
      network: 'mainnet',
    }),
  ],
  withAssociations: [
    makeTokenData({
      tokenId: '0.0.1111',
      name: 'Token 1',
      symbol: 'TK1',
      network: 'testnet',
      supplyType: 'INFINITE',
      associations: [{ name: 'Account 1', accountId: '0.0.9999' }],
    }),
    makeTokenData({
      tokenId: '0.0.2222',
      name: 'Token 2',
      symbol: 'TK2',
      network: 'testnet',
      supplyType: 'FINITE',
      maxSupply: 1000000,
    }),
  ],
  finiteSupply: [
    makeTokenData({
      tokenId: '0.0.1111',
      name: 'Finite Token',
      symbol: 'FNT',
      network: 'testnet',
      supplyType: 'FINITE',
      maxSupply: 500000,
    }),
  ],
};

/**
 * Pre-configured token statistics fixtures
 */
export const mockTokenStats = {
  empty: makeTokenStats(),
  twoTokens: makeTokenStats({
    total: 2,
    byNetwork: { testnet: 2 },
    bySupplyType: { INFINITE: 2 },
    withKeys: 2,
  }),
  withKeys: makeTokenStats({
    total: 1,
    byNetwork: { testnet: 1 },
    bySupplyType: { INFINITE: 1 },
    withKeys: 1,
  }),
  multiNetwork: makeTokenStats({
    total: 2,
    byNetwork: { testnet: 1, mainnet: 1 },
    bySupplyType: { INFINITE: 2 },
    withKeys: 2,
  }),
  withAssociations: makeTokenStats({
    total: 2,
    byNetwork: { testnet: 2 },
    bySupplyType: { INFINITE: 1, FINITE: 1 },
    withAssociations: 1,
    totalAssociations: 1,
    withKeys: 2,
  }),
  finiteSupply: makeTokenStats({
    total: 1,
    byNetwork: { testnet: 1 },
    bySupplyType: { FINITE: 1 },
    withKeys: 1,
  }),
};
