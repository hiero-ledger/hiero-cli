# Core Api Reference

Complete reference documentation for the Hiero CLI Core Api, including all services, interfaces, and types.

## 📋 Overview

The Core Api provides a stable, typed interface for plugins to interact with Hedera networks and CLI functionality. All services are injected into command handlers via dependency injection.

## 🏗️ Core Api Structure

```typescript
interface CoreApi {
  account: AccountService;
  token: TokenService;
  topic: TopicService;
  txExecution: TxExecutionService;
  state: StateService;
  mirror: HederaMirrornodeService;
  network: NetworkService;
  config: ConfigService;
  logger: Logger;
  alias: AliasService;
  kms: KmsService;
  hbar: HbarService;
  output: OutputService;
  receipt: ReceiptService;
}
```

## 🛠️ Service Interfaces

### Account Service

Handles Hedera account creation and management operations.

```typescript
interface AccountService {
  createAccount(params: CreateAccountParams): AccountCreateResult;
  updateAccount(params: UpdateAccountParams): AccountUpdateResult;
  deleteAccount(params: DeleteAccountParams): AccountDeleteResult;
  getAccountInfo(accountId: string): AccountInfoQuery;
}

interface CreateAccountParams {
  balanceRaw: bigint;
  maxAutoAssociations?: number;
  publicKey: string;
  keyType?: 'ECDSA' | 'ED25519';
}

interface AccountCreateResult {
  transaction: AccountCreateTransaction;
  publicKey: string;
}

interface UpdateAccountParams {
  accountId: string;
  key?: string;
  memo?: string | null; // null clears the memo
  maxAutoAssociations?: number;
  stakedAccountId?: string | null; // null clears staked account
  stakedNodeId?: number | null; // null clears staked node
  declineStakingReward?: boolean;
  autoRenewPeriod?: number;
  receiverSignatureRequired?: boolean;
}

interface AccountUpdateResult {
  transaction: AccountUpdateTransaction;
}

interface DeleteAccountParams {
  accountId: string;
  transferAccountId: string;
}

interface AccountDeleteResult {
  transaction: AccountDeleteTransaction;
}
```

**Usage Example:**

```typescript
const result = api.account.createAccount({
  balanceRaw: 100000000n, // tinybars (bigint)
  publicKey: '302e020100300506032b6570...',
  maxAutoAssociations: 10,
});
```

### Token Service

Handles Hedera token operations including creation, minting, association, and transfers (FT and NFT).

```typescript
interface TokenService {
  createTokenTransaction(params: TokenCreateParams): TokenCreateTransaction;

  createTokenAssociationTransaction(
    params: TokenAssociationParams,
  ): TokenAssociateTransaction;

  createTransferTransaction(params: TokenTransferParams): TransferTransaction;

  createMintTransaction(params: TokenMintParams): TokenMintTransaction;

  createNftTransferTransaction(params: NftTransferParams): TransferTransaction;

  createUpdateTokenTransaction(
    params: TokenUpdateParams,
  ): TokenUpdateTransaction;
}

interface TokenCreateParams {
  name: string;
  symbol: string;
  treasuryId: string;
  tokenType: 'FUNGIBLE_COMMON' | 'NON_FUNGIBLE_UNIQUE';
  decimals?: number;
  initialSupplyRaw?: bigint;
  supplyType: 'FINITE' | 'INFINITE';
  maxSupplyRaw?: bigint;
  adminPublicKey: PublicKey;
  supplyPublicKey?: PublicKey;
  wipePublicKey?: PublicKey;
  kycPublicKey?: PublicKey;
  freezePublicKey?: PublicKey;
  pausePublicKey?: PublicKey;
  feeSchedulePublicKey?: PublicKey;
  customFees?: CustomFee[];
  memo?: string;
}

interface TokenAssociationParams {
  tokenId: string;
  accountId: string;
}

interface TokenTransferParams {
  tokenId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: bigint;
}

interface TokenMintParams {
  tokenId: string;
  amount?: bigint;
  metadata?: Uint8Array;
}

interface NftTransferParams {
  tokenId: string;
  fromAccountId: string;
  toAccountId: string;
  serialNumbers: number[]; // Max 10 serials per transaction (Hedera limit)
}

interface TokenUpdateParams {
  tokenId: string;
  name?: string;
  symbol?: string;
  treasuryId?: string;
  adminKey?: Key | null; // null clears the key
  kycKey?: Key | null;
  freezeKey?: Key | null;
  wipeKey?: Key | null;
  supplyKey?: Key | null;
  feeScheduleKey?: Key | null;
  pauseKey?: Key | null;
  metadataKey?: Key | null;
  memo?: string | null; // null clears the memo
  autoRenewAccountId?: string;
  autoRenewPeriodSeconds?: number;
  expirationTime?: Date;
  metadata?: Uint8Array;
}
```

**Usage Examples:**

```typescript
const ftTransferTx = api.token.createTransferTransaction({
  tokenId: '0.0.123456',
  fromAccountId: '0.0.111111',
  toAccountId: '0.0.222222',
  amount: 100n,
});

const nftTransferTx = api.token.createNftTransferTransaction({
  tokenId: '0.0.123456',
  fromAccountId: '0.0.111111',
  toAccountId: '0.0.222222',
  serialNumbers: [1, 2, 3],
});

const result = await api.txExecution.signAndExecuteWith(nftTransferTx, [
  keyRefId,
]);
```

### Topic Service

Builds Hedera Consensus Service topic transactions (`TopicCreateTransaction`, `TopicDeleteTransaction`, `TopicMessageSubmitTransaction`). Signing and execution are typically done via `txSign` / `txExecute` (or batch flows).

```typescript
interface TopicService {
  createTopic(params: CreateTopicParams): TopicCreateResult;
  deleteTopic(params: DeleteTopicParams): TopicDeleteResult;
  submitMessage(params: SubmitMessageParams): MessageSubmitResult;
}

interface CreateTopicParams {
  memo?: string;
  adminKey?: Key;
  submitKey?: Key;
}

interface DeleteTopicParams {
  topicId: string;
}

interface SubmitMessageParams {
  topicId: string;
  message: string;
}

interface TopicCreateResult {
  transaction: TopicCreateTransaction;
}

interface TopicDeleteResult {
  transaction: TopicDeleteTransaction;
}

interface MessageSubmitResult {
  transaction: TopicMessageSubmitTransaction;
  sequenceNumber?: number;
}
```

`Key`, `TopicCreateTransaction`, `TopicDeleteTransaction`, and `TopicMessageSubmitTransaction` are Hedera SDK types (`@hashgraph/sdk`).

**Usage Example:**

```typescript
const { transaction } = api.topic.deleteTopic({
  topicId: '0.0.13579',
});
const signed = await api.txSign.sign(transaction, ['admin-key-ref']);
await api.txExecute.execute(signed);
```

### TxExecutionService

Manages transaction signing and execution.

```typescript
interface TxExecutionService {
  signAndExecute(transaction: HederaTransaction): Promise<TransactionResult>;

  signAndExecuteWith(
    tx: HederaTransaction,
    signer: SignerRef,
  ): Promise<TransactionResult>;

  freezeTx(transaction: HederaTransaction): HederaTransaction;
}

interface TransactionResult {
  transactionId: string;
  success: boolean;
  receipt: TransactionReceipt;
  accountId?: string;
  tokenId?: string;
  topicId?: string;
  topicSequenceNumber?: number;
  consensusTimestamp: string;
}

interface TransactionReceipt {
  status: TransactionStatus;
  accountId?: string;
  tokenId?: string;
  topicId?: string;
  topicSequenceNumber?: number;
  serials?: string[];
}

type SignerRef = {
  keyRefId?: string;
  publicKey?: string;
};
```

**Usage Example:**

```typescript
const result = await api.txExecution.signAndExecute(transaction);
```

### Receipt Service

Fetches transaction receipts by transaction ID using Hedera's `TransactionGetReceiptQuery`. Useful for retrieving receipt data (e.g. entity IDs, status) for transactions that were submitted separately, such as batch inner transactions.

```typescript
interface ReceiptService {
  getReceipt(params: TransactionReceiptParams): Promise<TransactionResult>;
}

interface TransactionReceiptParams {
  transactionId: string;
}
```

**Usage Example:**

```typescript
const result = await api.receipt.getReceipt({
  transactionId: '0.0.1234@1234567890.000',
});

if (result.success && result.accountId) {
  console.log(`Created account: ${result.accountId}`);
}
```

### State Service

Provides namespaced, versioned state management with Zustand.

```typescript
interface StateService {
  get<T>(namespace: string, key: string): T | undefined;
  set<T>(namespace: string, key: string, value: T): void;
  has(namespace: string, key: string): boolean;
  delete(namespace: string, key: string): void;
  clear(namespace: string): void;
  list(namespace: string): Array<{ key: string; value: unknown }>;
  getNamespaces(): string[];
  getKeys(namespace: string): string[];
}
```

**Usage Example:**

```typescript
// Store data
api.state.set('my-plugin-data', 'user-123', {
  name: 'John Doe',
  accountId: '0.0.123456',
});

// Retrieve data
const user = api.state.get('my-plugin-data', 'user-123');

// Check if data exists
const hasUser = api.state.has('my-plugin-data', 'user-123');

// List all data in namespace
const allUsers = api.state.list('my-plugin-data');
```

### Mirror Node Service

Provides comprehensive access to Hedera Mirror Node API.

```typescript
interface HederaMirrornodeService {
  // Account operations
  getAccountOrThrow(accountId: string): Promise<AccountResponse>;
  getAccount(accountId: string): Promise<AccountResponse | null>;
  getAccountTokenBalances(
    accountId: string,
    tokenId?: string,
  ): Promise<TokenBalancesResponse>;

  // Token operations
  getTokenInfo(tokenId: string): Promise<TokenInfo>;
  getNftInfo(tokenId: string, serialNumber: number): Promise<NftInfo>;

  // Topic operations
  getTopicInfo(topicId: string): Promise<TopicInfo>;
  getTopicMessages(
    queryParams: TopicMessagesQueryParams,
  ): Promise<TopicMessagesResponse>;

  // Transaction operations
  getTransactionRecord(
    transactionId: string,
    nonce?: number,
  ): Promise<TransactionDetailsResponse>;

  // Scheduled operations
  getScheduled(scheduleId: string): Promise<ScheduleInfo>;

  // Contract operations
  getContractInfo(contractId: string): Promise<ContractInfo>;

  // Network operations
  getExchangeRate(timestamp?: string): Promise<ExchangeRateResponse>;
}
```

**Usage Examples:**

```typescript
// Get account information (null if mirror returns 404)
const account = await api.mirror.getAccount('0.0.123456');
if (account) {
  console.log(
    `Account: ${account.accountId}, Balance: ${account.balance.balance}`,
  );
}

// Or require the account to exist (throws on 404 / other mirror errors)
const accountOrThrow = await api.mirror.getAccountOrThrow('0.0.123456');
console.log(`Balance: ${accountOrThrow.balance.balance} tinybars`);

// Get token balances
const tokenBalances = await api.mirror.getAccountTokenBalances('0.0.123456');
console.log(`Tokens: ${tokenBalances.tokens.length}`);

// Get topic messages
const messages = await api.mirror.getTopicMessages({
  topicId: '0.0.123456',
  limit: 10,
});
console.log(`Messages: ${messages.messages.length}`);

// Schedule entity (used by `schedule verify` and schedule resolution)
const scheduleInfo = await api.mirror.getScheduled('0.0.8452958');

// Transaction record (inner tx id from a scheduled execution; use dash form for the path segment)
const txRecord = await api.mirror.getTransactionRecord(
  '0.0.1234567-1234567890-123456789',
);
```

### Network Service

Manages network configuration, selection, and per-network operator credentials.

```typescript
interface NetworkService {
  getCurrentNetwork(): SupportedNetwork;
  setNetwork(network: SupportedNetwork): void;
  getAvailableNetworks(): string[];
  getNetworkConfig(network: string): NetworkConfig;
  switchNetwork(network: SupportedNetwork): void;
  getLocalnetConfig(): LocalnetConfig;
  isNetworkAvailable(network: string): boolean;
  setOperator(
    network: SupportedNetwork,
    operator: { accountId: string; keyRefId: string },
  ): void;
  getOperator(
    network: SupportedNetwork,
  ): { accountId: string; keyRefId: string } | null;
  hasAnyOperator(): boolean;
}

interface NetworkConfig {
  name: string;
  rpcUrl: string;
  mirrorNodeUrl: string;
  chainId: string;
  explorerUrl?: string;
  isTestnet: boolean;
  operator?: {
    accountId: string;
    keyRefId: string;
  };
}

interface LocalnetConfig {
  localNodeAddress: string;
  localNodeAccountId: string;
  localNodeMirrorAddressGRPC: string;
}
```

**Usage Example:**

```typescript
const currentNetwork = api.network.getCurrentNetwork();
const config = api.network.getNetworkConfig(currentNetwork);
const availableNetworks = api.network.getAvailableNetworks();

// Temporarily set network (in-memory only, does not persist)
api.network.setNetwork('previewnet');

// Switch network permanently (persists to state)
api.network.switchNetwork('testnet');

// Set operator for specific network
api.network.setOperator('testnet', {
  accountId: '0.0.123456',
  keyRefId: 'kr_test123',
});

// Get operator for current network
const operator = api.network.getOperator(currentNetwork);

// Check if any network has an operator configured
const isInitialized = api.network.hasAnyOperator();
```

> **💡 Interactive Setup (Initialization)**: For CLI users, when an operator is not configured and a command requiring it is executed interactively (human output mode), the CLI automatically launches an interactive **operator initialization wizard**. The wizard adapts based on whether this is the first initialization:
>
> - **First Time**: User is prompted to select a network (testnet recommended), then provide account credentials and global configuration (key manager, ED25519 support)
> - **Network Change**: User provides account credentials for the new network and is asked whether to override global settings
>
> In script mode (non-interactive), an error is thrown instead. For plugin developers, you may use `api.network.setOperator()` to configure operators programmatically.

### Config Service

Provides type-safe access to CLI configuration options.

```typescript
interface ConfigService {
  listOptions(): ConfigOptionDescriptor[];
  getOption<T = boolean | number | string>(name: string): T;
  setOption(name: string, value: boolean | number | string): void;
}

interface ConfigOptionDescriptor {
  name: string;
  type: 'boolean' | 'number' | 'string' | 'enum';
  value: boolean | number | string;
  allowedValues?: string[];
}
```

**Usage Example:**

```typescript
const options = api.config.listOptions();
const keyManager = api.config.getOption<string>('default_key_manager');
api.config.setOption('log_level', 'debug');
```

### Logger Service

Provides structured logging capabilities with configurable log levels.

```typescript
export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

interface Logger {
  info(message: string): void;
  error(message: string): void;
  warn(message: string): void;
  debug(message: string): void;

  /**
   * Set minimal log level.
   * Messages below this level are filtered out.
   */
  setLevel(level: LogLevel): void;
}
```

**Log level behaviour:**

- `silent` – no logs (default)
- `error` – only critical errors
- `warn` – warnings + errors
- `info` – normal informational logs + warnings + errors
- `debug` – debug details + info + warn + error

The global log level is controlled by the config option `log_level`:

- allowed values: `silent`, `error`, `warn`, `info`, `debug`
- default: `silent`
- configure via CLI, for example:

```bash
hcli config set -o log_level -v silent
hcli config set -o log_level -v error
hcli config set -o log_level -v debug
```

All logger output is written to **stderr** so that structured command output on stdout
remains clean and can be piped or parsed safely.

**Usage Example:**

```typescript
api.logger.info('Processing request...');
api.logger.warn('Deprecated feature used');
api.logger.error('Failed to process request');
api.logger.debug('Debug information...');
```

### KMS Service

Manages operator credentials and key management securely. **Private keys are never exposed to other services** - all signing operations are handled internally by the KMS using key references (`keyRefId`). This ensures that sensitive key material stays isolated within the KMS service.

**Storage Options:**

The KMS supports two storage modes for private keys:

- **`local`** - Keys stored as plain text (suitable for development and testing)
- **`local_encrypted`** - Keys encrypted using AES-256-GCM (recommended for production)

The default storage mode is configured via `hcli config set -o default_key_manager -v local|local_encrypted`. Individual operations can override this using the `--key-manager` flag when available.

```typescript
interface KmsService {
  createLocalPrivateKey(
    keyType: KeyAlgorithm,
    labels?: string[],
  ): {
    keyRefId: string;
    publicKey: string;
  };
  importPrivateKey(
    keyType: KeyAlgorithm,
    privateKey: string,
    labels?: string[],
  ): { keyRefId: string; publicKey: string };
  getPublicKey(keyRefId: string): string | null;
  getSignerHandle(keyRefId: string): KmsSignerService;
  findByPublicKey(publicKey: string): string | null;
  list(): Array<{
    keyRefId: string;
    type: CredentialType;
    publicKey: string;
    labels?: string[];
  }>;
  remove(keyRefId: string): void;
  createClient(network: SupportedNetwork): Client;
  signTransaction(
    transaction: HederaTransaction,
    keyRefId: string,
  ): Promise<void>;
}
```

**Usage Examples:**

```typescript
// Create and import keys (private keys are encrypted and stored securely)
const keyPair = api.kms.createLocalPrivateKey('ECDSA', ['my-key']);
const imported = api.kms.importPrivateKey('ECDSA', 'private-key-string', [
  'imported',
]);

// Get public key (only public keys are exposed, never private keys)
const publicKey = api.kms.getPublicKey(keyPair.keyRefId);

// List all keys (returns metadata, no private keys exposed)
const allKeys = api.kms.list();

// Sign transaction using keyRefId (private key never leaves KMS)
const transaction = new AccountCreateTransaction();
await api.kms.signTransaction(transaction, keyPair.keyRefId);

// Get signer handle for advanced signing operations (opaque handle, no key exposure)
const signer = api.kms.getSignerHandle(keyPair.keyRefId);
const signature = await signer.sign(messageBytes);

// Create Hedera client (automatically uses network-specific operator, keys managed internally)
const client = api.kms.createClient('testnet');
```

### Key Resolver Service

Resolves credentials into signing key references, public keys, and account identifiers. Handlers use this service to turn user-supplied credentials (private key strings, aliases, account IDs, etc.) into the `keyRefId` values that `TxSignService` needs for signing.

```typescript
interface KeyResolverService {
  // Resolves a credential to an account credential (accountId + keyRefId + publicKey).
  // Requires a private key in the KMS. Falls back to the network operator when
  // credential is undefined and fallback=true.
  resolveAccountCredentials(
    credential: Credential | undefined,
    keyManager: KeyManager,
    fallback?: boolean,
    labels?: string[],
  ): Promise<ResolvedAccountCredential>;

  // Resolves a credential to a public key reference only (no account association needed).
  getPublicKey(
    credential: Credential | undefined,
    keyManager: KeyManager,
    fallback?: boolean,
    labels?: string[],
  ): Promise<ResolvedPublicKey>;

  // Resolves a credential to a signing key (keyRefId + publicKey).
  // Requires a private key in the KMS.
  resolveSigningKey(
    credential: Credential | undefined,
    keyManager: KeyManager,
    fallback?: boolean,
    labels?: string[],
  ): Promise<ResolvedPublicKey>;

  // Looks up stored KMS key refs and returns their public keys.
  resolvedPublicKeysForStoredKeyRefs(keyRefIds: string[]): ResolvedPublicKey[];

  // Resolves signing keys from a mirror-node role key (e.g. admin_key) combined with
  // optional explicit CLI credentials. Returns the keyRefIds to pass to txSign.sign().
  resolveSigningKeys(params: SigningKeyParams): Promise<SigningKeysResult>;

  // Resolves signing keys when the caller supplies explicit credentials.
  resolveExplicitSigningKeys(
    params: ExplicitSigningKeysParams,
  ): Promise<SigningKeysResult>;

  // Resolves signing keys by matching mirror-node public keys against the KMS.
  resolveMirrorNodeSigningKeys(
    params: MirrorNodeSigningKeysParams,
  ): SigningKeysResult;
}

interface SigningKeyParams {
  mirrorRoleKey: MirrorNodeKey | null | undefined; // e.g. tokenInfo.admin_key
  explicitCredentials: Credential[]; // from --admin-keys, etc.
  keyManager: KeyManager;
  signingKeyLabels: string[]; // e.g. ['token:admin']
  emptyMirrorRoleKeyMessage: string; // thrown when role key is absent
  insufficientKmsMatchesMessage: string; // thrown when KMS has no match
  validationErrorOptions?: { context?: Record<string, unknown> };
}

interface SigningKeysResult {
  keyRefIds: string[];
  requiredSignatures: number;
}

type ResolvedPublicKey = { keyRefId: string; publicKey: string };

type ResolvedAccountCredential = {
  keyRefId: string;
  accountId: string;
  publicKey: string;
};
```

**Usage Example (token admin key resolution):**

```typescript
const result = await api.keyResolver.resolveSigningKeys({
  mirrorRoleKey: tokenInfo.admin_key,
  explicitCredentials: validArgs.adminKeys,
  keyManager,
  signingKeyLabels: ['token:admin'],
  emptyMirrorRoleKeyMessage: 'This token has no admin key on Hedera.',
  insufficientKmsMatchesMessage:
    'Admin key not found in key manager. Provide --admin-keys.',
  validationErrorOptions: { context: { tokenId } },
});

const signed = await api.txSign.sign(transaction, result.keyRefIds);
```

## Command Handler Context

All plugin command handlers receive a `CommandHandlerArgs` object (defined in `src/core/plugins/plugin.interface.ts`) that provides:

```typescript
interface CommandHandlerArgs {
  args: Record<string, unknown>; // Parsed CLI arguments
  api: CoreApi; // Core API instance injected per execution
  state: StateManager; // Namespaced access to persisted state
  config: ConfigView; // CLI configuration access (get/set/list options)
  logger: Logger; // Structured logging
}
```

**Field Details:**

- `args` – Parsed command-line arguments from the user
- `api` – Complete Core API instance with all services (account, token, kms, mirror, etc.)
- `state` – StateManager (alias for StateService) providing namespaced state storage
- `config` – ConfigView (alias for ConfigService) for accessing and modifying CLI configuration options
- `logger` – Structured logging interface with info, error, warn, and debug methods

For handler patterns, result contracts, and testing examples, see [`PLUGIN_ARCHITECTURE_GUIDE.md`](../PLUGIN_ARCHITECTURE_GUIDE.md).

## Output Schemas

Core API services are designed to work with structured command outputs defined via Zod schemas and templates. The full specification of output schemas and templates lives in:

- [Output Schemas Guide](./output-schemas-guide.md)

## 📚 Related Documentation

- [Plugin Development Guide](../PLUGIN_ARCHITECTURE_GUIDE.md)
- [Architecture Overview](./architecture.md)
- [Output Schemas Guide](./output-schemas-guide.md)
- [Contributing Guide](../CONTRIBUTING.md)
- [Architecture Decision Records](./adr/) - ADRs for interested developers

```

```
