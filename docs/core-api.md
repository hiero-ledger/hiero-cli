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
}
```

## 🛠️ Service Interfaces

### Account Service

Handles Hedera account creation and management operations.

```typescript
interface AccountService {
  createAccount(params: CreateAccountParams): Promise<AccountCreateResult>;
  getAccountInfo(accountId: string): Promise<AccountInfoQuery>;
  getAccountBalance(
    accountId: string,
    tokenId?: string,
  ): Promise<AccountBalanceQuery>;
}

interface CreateAccountParams {
  balanceRaw: number;
  maxAutoAssociations?: number;
  publicKey: string;
  keyType?: 'ECDSA' | 'ED25519';
}

interface AccountCreateResult {
  transaction: AccountCreateTransaction;
  publicKey: string;
}
```

**Usage Example:**

```typescript
const result = await api.account.createAccount({
  balanceRaw: 100000000, // tinybars
  publicKey: '302e020100300506032b6570...',
  keyType: 'ECDSA',
  maxAutoAssociations: 10,
});
```

### Token Service

Handles Hedera token operations including creation, minting, association, and transfers.

```typescript
interface TokenService {
  createFungibleTokenTransaction(
    params: TokenCreateParams,
  ): TokenCreateTransaction;

  createTokenAssociationTransaction(
    params: TokenAssociationParams,
  ): TokenAssociateTransaction;

  createFungibleTokenTransferTransaction(
    params: FungibleTokenTransferParams,
  ): TransferTransaction;

  createMintTransaction(params: TokenMintParams): TokenMintTransaction;

  createNftTransferTransaction(params: NftTransferParams): TransferTransaction;
}

interface NftTransferParams {
  tokenId: string;
  fromAccountId: string;
  toAccountId: string;
  serialNumbers: number[]; // Max 10 serials per transaction (Hedera limit)
}
```

**Usage Example:**

```typescript
const transferTx = api.token.createNftTransferTransaction({
  tokenId: '0.0.123456',
  fromAccountId: '0.0.111111',
  toAccountId: '0.0.222222',
  serialNumbers: [1, 2, 3],
});

const result = await api.txExecution.signAndExecuteWith(transferTx, [keyRefId]);
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

type SignerRef = {
  keyRefId?: string;
  publicKey?: string;
};
```

**Usage Example:**

```typescript
const receipt = await api.txExecution.signAndExecute(transaction);
const status = await api.txExecution.getTransactionStatus(transactionId);
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
  getAccount(accountId: string): Promise<AccountResponse>;
  getAccountHBarBalance(accountId: string): Promise<bigint>;
  getAccountTokenBalances(
    accountId: string,
    tokenId?: string,
  ): Promise<TokenBalancesResponse>;

  // Token operations
  getTokenInfo(tokenId: string): Promise<TokenInfo>;

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

  // Contract operations
  getContractInfo(contractId: string): Promise<ContractInfo>;

  // Network operations
  getExchangeRate(timestamp?: string): Promise<ExchangeRateResponse>;
}
```

**Usage Examples:**

```typescript
// Get account information
const account = await api.mirror.getAccount('0.0.123456');
console.log(
  `Account: ${account.accountId}, Balance: ${account.balance.balance}`,
);

// Get HBAR balance
const balance = await api.mirror.getAccountHBarBalance('0.0.123456');
console.log(`Balance: ${balance.toString()} tinybars`);

// Get token balances
const tokenBalances = await api.mirror.getAccountTokenBalances('0.0.123456');
console.log(`Tokens: ${tokenBalances.tokens.length}`);

// Get topic messages
const messages = await api.mirror.getTopicMessages({
  topicId: '0.0.123456',
  limit: 10,
});
console.log(`Messages: ${messages.messages.length}`);
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

Provides read-only access to CLI configuration.

```typescript
interface ConfigService {
  getCurrentNetwork(): string;
  getNetworkConfig(network: string): NetworkConfig;
  getAvailableNetworks(): string[];
  getOperatorId(): string;
  getOperatorKey(): string;
}
```

**Usage Example:**

```typescript
const config = api.config.getConfig();
const network = api.config.getValue('network');
const hasCustomSetting = api.config.hasValue('custom.setting');
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
