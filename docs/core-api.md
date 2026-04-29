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
  txSign: TxSignService;
  txExecute: TxExecuteService;
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
  pluginManagement: PluginManagementService;
  keyResolver: KeyResolverService;
  identityResolution: IdentityResolutionService;
  contract: ContractTransactionService;
  contractCompiler: ContractCompilerService;
  contractVerifier: ContractVerifierService;
  contractQuery: ContractQueryService;
  batch: BatchTransactionService;
  schedule: ScheduleTransactionService;
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

const signed = await api.txSign.sign(nftTransferTx, [keyRefId]);
const result = await api.txExecute.execute(signed);
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

### TxSignService

Signs Hedera transactions using key references stored in the KMS. Signing is decoupled from execution so that the same signed transaction can be inspected or used in batch flows before being submitted.

```typescript
interface TxSignService {
  sign(transaction: Transaction, keyRefIds: string[]): Promise<Transaction>;
  signContractCreateFlow(
    transaction: ContractCreateFlow,
    keyRefIds: string[],
  ): ContractCreateFlow;
}
```

**Usage Example:**

```typescript
const signed = await api.txSign.sign(transaction, [
  'admin-key-ref',
  'treasury-key-ref',
]);
```

### TxExecuteService

Executes a signed transaction on the Hedera network and returns a `TransactionResult`.

```typescript
interface TxExecuteService {
  execute(transaction: Transaction): Promise<TransactionResult>;
  executeContractCreateFlow(
    transaction: ContractCreateFlow,
  ): Promise<TransactionResult>;
}

interface TransactionResult {
  transactionId: string;
  success: boolean;
  receipt: TransactionReceipt;
  accountId?: string;
  tokenId?: string;
  topicId?: string;
  contractId?: string;
  topicSequenceNumber?: number;
  serials?: string[];
  consensusTimestamp: string;
}
```

**Usage Example:**

```typescript
const signed = await api.txSign.sign(transaction, [keyRefId]);
const result = await api.txExecute.execute(signed);
console.log(`Transaction ID: ${result.transactionId}`);
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

### Alias Service

Stores and resolves human-readable aliases for Hedera entities (accounts, tokens, topics, contracts) per-network.

```typescript
interface AliasService {
  register(record: AliasRecord): void;
  resolve(
    ref: string,
    expectation: AliasType | undefined,
    network: SupportedNetwork,
  ): AliasRecord | null;
  resolveOrThrow(
    alias: string,
    type: AliasType,
    network: SupportedNetwork,
  ): AliasRecord;
  resolveByEvmAddress(
    evmAddress: string,
    network: SupportedNetwork,
  ): AliasRecord | null;
  list(filter?: {
    network?: SupportedNetwork;
    type?: AliasType;
  }): AliasRecord[];
  remove(alias: string, network: SupportedNetwork): void;
  clear(type: AliasType): void;
  exists(alias: string, network: SupportedNetwork): boolean;
  availableOrThrow(alias: string | undefined, network: SupportedNetwork): void;
}

interface AliasRecord {
  alias: string;
  type: AliasType;
  network: SupportedNetwork;
  entityId?: string;
  evmAddress?: string;
  publicKey?: string;
  keyRefId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
```

**Usage Example:**

```typescript
api.alias.register({
  alias: 'my-account',
  type: 'account',
  network: 'testnet',
  entityId: '0.0.123456',
  createdAt: new Date().toISOString(),
});

const record = api.alias.resolveOrThrow('my-account', 'account', 'testnet');
console.log(record.entityId); // '0.0.123456'
```

### HBAR Service

Builds HBAR transfer and allowance transactions.

```typescript
interface HbarService {
  transferTinybar(
    params: TransferTinybarParams,
  ): Promise<TransferTinybarResult>;
  createHbarAllowanceTransaction(
    params: HbarAllowanceParams,
  ): HbarAllowanceResult;
}
```

**Usage Example:**

```typescript
const result = await api.hbar.transferTinybar({
  fromAccountId: '0.0.111111',
  toAccountId: '0.0.222222',
  amount: 100_000_000n, // 1 HBAR in tinybars
});
```

### Output Service

Controls command output formatting and rendering. Plugins use this to emit results in the correct format (human-readable template or JSON).

```typescript
interface OutputService {
  handleOutput(options: OutputHandlerOptions): void;
  getFormat(): OutputFormat;
  setFormat(format: OutputFormat): void;
  emptyLine(): void;
}
```

### Plugin Management Service

Manages plugin registration state — add, remove, enable, and disable plugins. Also tracks which default plugins have been auto-initialized so that re-installs don't re-add user-removed defaults.

```typescript
interface PluginManagementService {
  listPlugins(): PluginStateEntry[];
  getPlugin(name: string): PluginStateEntry | undefined;
  addPlugin(entry: PluginStateEntry): PluginManagementCreateResult;
  removePlugin(name: string): PluginManagementRemoveResult;
  enablePlugin(name: string): PluginManagementEnableResult;
  disablePlugin(name: string): PluginManagementDisableResult;
  resetPlugins(): void;
  savePluginState(entry: PluginStateEntry): void;
  getInitializedDefaults(): string[];
  setInitializedDefaults(names: string[]): void;
  addToInitializedDefaults(name: string): void;
}
```

### Key Resolver Service

Resolves CLI credential references into KMS-backed keys ready for transaction signing. Abstracts the distinction between sender, receiver, and role-only key contexts.

```typescript
interface KeyResolverService {
  // Sender: requires accountId + private key in KMS
  resolveAccountCredentials(
    credential: Credential | undefined,
    keyManager: KeyManager,
    fallback?: boolean,
    labels?: string[],
  ): Promise<ResolvedAccountCredential>;

  // Receiver: requires accountId or evmAddress, no private key needed
  resolveDestination(
    credential: Credential,
    keyManager: KeyManager,
    labels?: string[],
  ): Promise<Destination>;

  // Read-only: public key + keyRefId, no account association
  getPublicKey(
    credential: Credential | undefined,
    keyManager: KeyManager,
    fallback?: boolean,
    labels?: string[],
  ): Promise<ResolvedPublicKey>;

  // Role key (adminKey, supplyKey, etc.): private key in KMS, no account
  resolveSigningKey(
    credential: Credential | undefined,
    keyManager: KeyManager,
    fallback?: boolean,
    labels?: string[],
  ): Promise<ResolvedPublicKey>;

  resolvedPublicKeysForStoredKeyRefs(keyRefIds: string[]): ResolvedPublicKey[];

  resolveSigningKeyRefIdsFromMirrorRoleKey(
    params: ResolveSigningKeyRefIdsFromMirrorRoleKeyInput,
  ): Promise<ResolveSigningKeyRefIdsFromMirrorRoleKeyResult>;
}
```

### Identity Resolution Service

Resolves string references (account IDs, aliases, EVM addresses) to canonical Hedera entity identifiers. Used internally by many commands to accept flexible input formats.

```typescript
interface IdentityResolutionService {
  resolveAccount(
    params: AccountResolutionParams,
  ): Promise<AccountResolutionResult>;
  resolveContract(
    params: ContractResolutionParams,
  ): Promise<ContractResolutionResult>;
  resolveReferenceToEntityOrEvmAddress(
    params: ReferenceResolutionParams,
  ): ReferenceResolutionResult;
}
```

### Contract Transaction Service

Builds Hedera smart contract transactions without executing them. Execution is done via `txSign` / `txExecute`.

```typescript
interface ContractTransactionService {
  contractCreateFlowTransaction(
    params: ContractCreateFlowParams,
  ): ContractCreateFlowResult;
  contractExecuteTransaction(
    params: ContractExecuteParams,
  ): ContractExecuteResult;
  contractExecuteWithEncodedParams(
    params: ContractExecuteEncodedParams,
  ): ContractExecuteResult;
  deleteContract(params: DeleteContractParams): ContractDeleteResult;
}
```

### Contract Compiler Service

Compiles Solidity source files to bytecode and ABI using the `solc` compiler.

```typescript
interface ContractCompilerService {
  compileContract(params: CompilationParams): Promise<CompilationResult>;
}
```

**Usage Example:**

```typescript
const { bytecode, abi } = await api.contractCompiler.compileContract({
  sourceFile: './MyContract.sol',
  contractName: 'MyContract',
});
```

### Contract Verifier Service

Submits deployed contracts for source-code verification against the Hashscan verification repository.

```typescript
interface ContractVerifierService {
  verifyContract(
    params: ContractVerificationParams,
  ): Promise<ContractVerificationResult>;
  isVerifiedFullMatchOnRepository(contractEvmAddress: string): Promise<boolean>;
}
```

### Contract Query Service

Executes read-only (`ContractCallQuery`) calls against deployed smart contracts without submitting a transaction.

```typescript
interface ContractQueryService {
  queryContractFunction(
    params: QueryContractFunctionParams,
  ): Promise<QueryContractFunctionResult>;
}
```

### Batch Transaction Service

Builds a Hedera `BatchTransaction` that groups multiple inner transactions into a single atomic submission.

```typescript
interface BatchTransactionService {
  createBatchTransaction(
    params: CreateBatchTransactionParams,
  ): CreateBatchTransactionResult;
}
```

**Usage Example:**

```typescript
const { batchTransaction, innerTransactionIds } =
  api.batch.createBatchTransaction({ innerTransactions: [tx1, tx2, tx3] });
const signed = await api.txSign.sign(batchTransaction, [operatorKeyRef]);
await api.txExecute.execute(signed);
```

### Schedule Transaction Service

Builds scheduled transaction wrappers — `ScheduleCreate`, `ScheduleSign`, and `ScheduleDelete` — for deferred multi-signature workflows.

```typescript
interface ScheduleTransactionService {
  buildScheduleCreateTransaction(
    params: ScheduleCreateParams,
  ): ScheduleCreateTransaction;
  buildScheduleSignTransaction(
    params: ScheduleSignTransactionParams,
  ): ScheduleSignTransaction;
  buildScheduleDeleteTransaction(
    params: ScheduleDeleteTransactionParams,
  ): ScheduleDeleteTransaction;
}
```

**Usage Example:**

```typescript
const scheduleCreate = api.schedule.buildScheduleCreateTransaction({
  scheduledTransaction: transferTx,
  memo: 'pending approval',
  payerAccountId: '0.0.123456',
});
const signed = await api.txSign.sign(scheduleCreate, [keyRefId]);
const result = await api.txExecute.execute(signed);
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
