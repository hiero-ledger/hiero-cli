import {
  CustomFee,
  PrivateKey,
  TokenCreateTransaction,
  TokenType,
} from '@hashgraph/sdk';
import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  Account,
  FixedFee,
  FractionalFee,
  Keys,
  Token,
} from '../../../types/state';
import { get as storeGet, saveKey as storeSaveKey } from '../../state/store';
import accountUtils from '../../utils/account';
import { heading, success } from '../../utils/color';
import dynamicVariablesUtils from '../../utils/dynamicVariables';
import { exitOnError, fail } from '../../utils/errors';
import feeUtils from '../../utils/fees';
import { Logger } from '../../utils/logger';
import { isJsonOutput, printOutput } from '../../utils/output';
import signUtils from '../../utils/sign';
import stateUtils from '../../utils/state';
import tokenUtils from '../../utils/token';
import { telemetryPreAction } from '../shared/telemetryHook';
import {
  mapToTokenInput,
  TokenFileDefinition,
  validateTokenFile,
} from './schema';

const logger = Logger.getInstance();

interface CreateTokenFromFileOptions {
  file: string;
  args: string[];
}

// TokenInput now derives from validated token file definition shape
interface TokenInput extends TokenFileDefinition {
  treasuryId?: string; // may be inferred
}

function getTreasuryIdByTreasuryKey(treasuryKey: string): string {
  const account = accountUtils.findAccountByPrivateKey(treasuryKey);
  if (!account) {
    logger.error('Treasury account not found');
    fail('Treasury account not found');
  }
  return account.accountId;
}

async function createAccountForToken(
  key: string,
  initialBalance: number,
  type: string,
  name: string,
): Promise<{ key: string; account: Account }> {
  const account = await accountUtils.createAccount(initialBalance, type, name);
  return { key, account };
}

function resolveTokenFilePath(filePath: string): string {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }

  return path.resolve(filePath);
}

function initializeToken(tokenInput: TokenInput): Token {
  const token: Token = {
    network: stateUtils.getNetwork(),
    associations: [],
    tokenId: '',
    name: tokenInput.name,
    symbol: tokenInput.symbol,
    treasuryId: tokenInput.treasuryId || '',
    decimals: tokenInput.decimals,
    initialSupply: tokenInput.initialSupply,
    supplyType: 'infinite',
    maxSupply: tokenInput.maxSupply || 0,
    keys: {
      adminKey: tokenInput.keys.adminKey,
      pauseKey: tokenInput.keys.pauseKey,
      kycKey: tokenInput.keys.kycKey,
      wipeKey: tokenInput.keys.wipeKey,
      freezeKey: tokenInput.keys.freezeKey,
      supplyKey: tokenInput.keys.supplyKey,
      feeScheduleKey: tokenInput.keys.feeScheduleKey,
      treasuryKey: tokenInput.keys.treasuryKey,
    },
    customFees: tokenInput.customFees,
  };

  return token;
}

/**
 * Find name pattern in keys on token and replace with private key
 * @param keys
 * @return updated keys
 */
function replaceNamePattern(keys: Keys): Keys {
  const accounts = storeGet('accounts');
  const namePattern = /<name:([a-zA-Z0-9_-]+)>/;
  const newKeys = { ...keys };

  Object.keys(newKeys).forEach((key) => {
    const match = newKeys[key as keyof typeof newKeys].match(namePattern);

    if (match) {
      const name = match[1];
      if (accounts[name]) {
        newKeys[key as keyof typeof newKeys] = accounts[name].privateKey;
      }
    }
  });

  return newKeys;
}

/**
 * Create new accounts for keys that match the `newkey` pattern
 * and replace the pattern with the new private key
 *
 * @param keys
 * @returns promise array of new accounts
 */
function findNewKeyPattern(
  keys: Keys,
): Promise<{ key: string; account: Account }>[] {
  const newAccountPromises: Promise<{ key: string; account: Account }>[] = [];

  // Only allow ECDSA
  const newKeyPattern = /<newkey:(ecdsa|ECDSA):(\d+)>/;
  Object.keys(keys).forEach((key) => {
    const match = keys[key as keyof typeof keys].match(newKeyPattern);

    if (match) {
      const initialBalance = Number(match[2]); // Initial balance in tinybars
      newAccountPromises.push(
        createAccountForToken(key, initialBalance, 'ECDSA', 'random'), // Random name because you can create an account upfront in scripts and give it an name to be used in the template
      );
    } else if (
      /<newkey:(ed25519|ED25519):(\d+)>/.test(keys[key as keyof typeof keys])
    ) {
      logger.error(
        'ED25519 keys are no longer supported. Only ECDSA is allowed.',
      );
      fail('Unsupported key type ED25519');
    }
  });

  return newAccountPromises;
}

/**
 * Replace keys that match the `newkey` pattern with the new private key
 * @param keys
 * @returns updated keys
 */
async function handleNewKeyPattern(keys: Keys): Promise<Keys> {
  const newAccountPromises: Promise<{ key: string; account: Account }>[] =
    findNewKeyPattern(keys);

  // Create new accounts if pattern is detected
  const newKeys = { ...keys };
  if (newAccountPromises.length > 0) {
    try {
      const newAccounts = await Promise.all(newAccountPromises);
      newAccounts.forEach((newAccount) => {
        newKeys[newAccount.key as keyof typeof newKeys] =
          newAccount.account.privateKey;
      });
    } catch (error) {
      logger.error(
        'Failed to create new account(s) for token',
        error as object,
      );
      fail('Failed to create new account(s) for token');
    }
  }

  return newKeys;
}

async function replaceKeysForToken(token: Token): Promise<Token> {
  const newToken = { ...token };

  // Look for name pattern in keys on token
  newToken.keys = replaceNamePattern(newToken.keys);

  // Look for `newkey` pattern in keys on token
  newToken.keys = await handleNewKeyPattern(newToken.keys);

  return newToken;
}

async function prepareTokenCreation(
  token: Token,
  tokenInput: TokenInput,
): Promise<Token> {
  token.supplyType = tokenInput.supplyType;
  token = await replaceKeysForToken(token);

  if (token.treasuryId === '') {
    token.treasuryId = getTreasuryIdByTreasuryKey(token.keys.treasuryKey);
  }

  return token;
}

function addKeysToTokenCreateTx(
  tokenCreateTx: TokenCreateTransaction,
  token: Token,
) {
  // Mapping key names to their corresponding setter methods wrapped to preserve binding
  const keySetters: Record<
    string,
    (
      pub: ReturnType<typeof PrivateKey.fromStringDer>['publicKey'],
    ) => TokenCreateTransaction
  > = {
    adminKey: (pub) => tokenCreateTx.setAdminKey(pub),
    pauseKey: (pub) => tokenCreateTx.setPauseKey(pub),
    kycKey: (pub) => tokenCreateTx.setKycKey(pub),
    wipeKey: (pub) => tokenCreateTx.setWipeKey(pub),
    freezeKey: (pub) => tokenCreateTx.setFreezeKey(pub),
    supplyKey: (pub) => tokenCreateTx.setSupplyKey(pub),
    feeScheduleKey: (pub) => tokenCreateTx.setFeeScheduleKey(pub),
  };

  Object.entries(keySetters).forEach(([key, setter]) => {
    const keyValue = token.keys[key as keyof typeof token.keys];
    if (keyValue && keyValue !== '') {
      const publicKey = PrivateKey.fromStringDer(keyValue).publicKey;
      setter(publicKey);
    }
  });
}

async function createTokenOnNetwork(token: Token) {
  const client = stateUtils.getHederaClient();

  try {
    const tokenCreateTx = new TokenCreateTransaction()
      .setTokenName(token.name)
      .setTokenSymbol(token.symbol)
      .setDecimals(token.decimals)
      .setInitialSupply(token.initialSupply)
      .setTokenType(TokenType.FungibleCommon)
      .setSupplyType(tokenUtils.getSupplyType(token.supplyType))
      .setTreasuryAccountId(token.treasuryId);

    if (token.supplyType === 'finite') {
      tokenCreateTx.setMaxSupply(token.maxSupply);
    }

    // Add keys
    addKeysToTokenCreateTx(tokenCreateTx, token);

    // Add custom fees
    const fees: CustomFee[] = token.customFees.map((fee) => {
      switch (fee.type) {
        case 'fixed':
          return feeUtils.createCustomFixedFee(fee as FixedFee);
        case 'fractional':
          return feeUtils.createCustomFractionalFee(fee as FractionalFee);
        default:
          logger.error(`Unsupported fee type: ${fee.type}`);
          client.close();
          fail(`Unsupported fee type: ${fee.type}`);
      }
    });
    tokenCreateTx.setCustomFees(fees);

    // Signing
    tokenCreateTx.freezeWith(client);
    const signedTokenCreateTx = await signUtils.signByType(
      tokenCreateTx,
      'tokenCreate',
      {
        adminKey: token.keys.adminKey,
        treasuryKey: token.keys.treasuryKey,
      },
    );

    // Execute
    const tokenCreateSubmit = await signedTokenCreateTx.execute(client);
    const tokenCreateRx = await tokenCreateSubmit.getReceipt(client);

    if (tokenCreateRx.tokenId == null) {
      logger.error('Token was not created');
      client.close();
      fail('Token was not created');
    }

    token.tokenId = tokenCreateRx.tokenId.toString();
    if (isJsonOutput()) {
      printOutput('tokenCreateFromFile', {
        tokenId: token.tokenId,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        initialSupply: token.initialSupply,
        supplyType: token.supplyType,
        maxSupply: token.maxSupply,
        customFeesCount: token.customFees.length,
      });
    } else {
      logger.log(heading('Token created:') + ' ' + success(token.tokenId));
    }
    client.close();
  } catch (error) {
    logger.error(error as object);
    client.close();
    fail('Failed to create token on network');
  }
}

function updateTokenState(token: Token) {
  const tokens = storeGet('tokens');
  const updatedTokens: Record<string, Token> = {
    ...tokens,
    [token.tokenId]: token,
  };
  storeSaveKey('tokens', updatedTokens);
  stateUtils.getHederaClient().close();
}

async function createTokenFromFile(tokenInput: TokenInput): Promise<Token> {
  try {
    let token = initializeToken(tokenInput);
    token = await prepareTokenCreation(token, tokenInput);
    await createTokenOnNetwork(token);
    updateTokenState(token);
    return token;
  } catch (error) {
    logger.error(error as object);
    stateUtils.getHederaClient().close();
    fail('Failed to create token from file');
  }
}

async function createToken(options: CreateTokenFromFileOptions) {
  logger.verbose(`Creating token from template with name: ${options.file}`);
  const replaceTokenOptions = (
    o: CreateTokenFromFileOptions,
  ): CreateTokenFromFileOptions =>
    dynamicVariablesUtils.replaceOptions<CreateTokenFromFileOptions>(o);
  const resolvedOptions = replaceTokenOptions(options);

  const filepath = resolveTokenFilePath(resolvedOptions.file);
  const fileContent = await fs.readFile(filepath, 'utf-8');
  const raw = JSON.parse(fileContent) as unknown;
  const validated = validateTokenFile(raw);
  if (!validated.valid || !validated.data) {
    logger.error('Token file validation failed');
    if (validated.errors && validated.errors.length) {
      validated.errors.forEach((e) => logger.error(e));
    }
    fail('Invalid token definition file');
  }
  const tokenDefinition = mapToTokenInput(validated.data);
  const token = await createTokenFromFile(tokenDefinition as TokenInput);

  // Store dynamic script variables
  dynamicVariablesUtils.storeArgs(
    resolvedOptions.args,
    dynamicVariablesUtils.commandActions.token.createFromFile.action,
    {
      tokenId: token.tokenId,
      name: token.name,
      symbol: token.symbol,
      treasuryId: token.treasuryId,
      adminKey: token.keys.adminKey,
      pauseKey: token.keys.pauseKey,
      kycKey: token.keys.kycKey,
      wipeKey: token.keys.wipeKey,
      freezeKey: token.keys.freezeKey,
      supplyKey: token.keys.supplyKey,
      feeScheduleKey: token.keys.feeScheduleKey,
      treasuryKey: token.keys.treasuryKey,
    },
  );
}

export default (program: Command) => {
  program
    .command('create-from-file')
    .hook('preAction', telemetryPreAction)
    .description('Create a new token from a file')
    .requiredOption(
      '-f, --file <filename>',
      'Filename containing the token information',
    )
    .option(
      '--args <args>',
      'Store arguments for scripts',
      (value: string, previous: string[]) =>
        previous ? [...previous, value] : [value],
      [] as string[],
    )
    .action(exitOnError(createToken))
    .addHelpText(
      'afterAll',
      '\nExamples:\n  $ hedera token create-from-file -f mytoken\n  $ hedera --json token create-from-file -f mytoken',
    );
};
