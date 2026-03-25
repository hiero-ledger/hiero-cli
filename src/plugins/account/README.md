# Account Plugin

Complete account management plugin for the Hiero CLI following the plugin architecture.

## 🏗️ Architecture

This plugin follows the plugin architecture principles:

- **Stateless**: Plugin is functionally stateless
- **Dependency Injection**: Services are injected into command handlers
- **Manifest-Driven**: Capabilities declared via manifest
- **Namespace Isolation**: Own state namespace (`account-accounts`)
- **Type Safety**: Full TypeScript support

## 📁 Structure

```
src/plugins/account/
├── manifest.ts              # Plugin manifest with command definitions
├── schema.ts                # Account data schema with Zod validation
├── commands/
│   ├── create/
│   │   ├── handler.ts      # Account creation handler
│   │   ├── input.ts        # Input schema
│   │   ├── output.ts       # Output schema and template
│   │   ├── types.ts        # Command types
│   │   └── index.ts        # Command exports
│   ├── import/
│   │   ├── handler.ts      # Account import handler
│   │   ├── input.ts        # Input schema
│   │   ├── output.ts       # Output schema and template
│   │   └── index.ts        # Command exports
│   ├── balance/
│   │   ├── handler.ts      # Balance retrieval handler
│   │   ├── input.ts        # Input schema
│   │   ├── output.ts       # Output schema and template
│   │   └── index.ts        # Command exports
│   ├── list/
│   │   ├── handler.ts      # List accounts handler
│   │   ├── input.ts        # Input schema
│   │   ├── output.ts       # Output schema and template
│   │   └── index.ts        # Command exports
│   ├── view/
│   │   ├── handler.ts      # View account details handler
│   │   ├── input.ts        # Input schema
│   │   ├── output.ts       # Output schema and template
│   │   └── index.ts        # Command exports
│   ├── delete/
│   │   ├── handler.ts      # Delete account handler
│   │   ├── input.ts        # Input schema
│   │   ├── output.ts       # Output schema and template
│   │   └── index.ts        # Command exports
│   └── clear/
│       ├── handler.ts      # Clear all accounts handler
│       ├── output.ts       # Output schema and template
│       └── index.ts        # Command exports
├── hooks/
│   └── batch-create/
│       ├── handler.ts      # AccountCreateBatchStateHook - persists account state after batch execution
│       ├── types.ts        # AccountCreateNormalisedParamsSchema for batch item validation
│       └── index.ts        # Hook exports
├── utils/
│   ├── account-address.ts  # EVM address derivation helpers
│   ├── balance-helpers.ts  # Balance retrieval utilities
│   └── account-validation.ts
├── zustand-state-helper.ts  # State management helper
├── __tests__/unit/          # Unit tests
└── index.ts                # Plugin exports
```

## 🚀 Commands

All commands return `CommandResult` with structured output data in the `result` field. Errors are thrown as typed `CliError` instances and handled uniformly by the core framework.

Each command defines a Zod schema for output validation and a Handlebars template for human-readable formatting.

### Account Create

Create a new Hedera account with specified balance and settings.

```bash
# Basic usage
hcli account create \
  --balance 100000000 \
  --auto-associations 10 \
  --name myaccount \
  --payer operator-name

# With specific key manager
hcli account create --balance 1.0 --name alice --key-manager local_encrypted
```

**Batch support:** The `account create` command registers the `batchify` hook, so you can add account creation to a batch instead of executing immediately. Pass `--batch <batch-name>` to defer execution:

```bash
# Add account creation to a batch (transaction not executed until batch execute)
hcli account create --balance 1.0 --name alice --batch my-batch
```

When the batch is executed via `hcli batch execute --name my-batch`, the `AccountCreateBatchStateHook` runs to persist each created account to state (including alias registration and EVM address derivation).

### Account Import

```bash
hcli account import \
  --id 0.0.123456 \
  --key <private-key> \
  --name imported-account
```

### Account Balance

```bash
hcli account balance --account myaccount
hcli account balance --account 0.0.123456 --hbar-only
```

### Account List

```bash
hcli account list
hcli account list --private  # Show key reference IDs
```

### Account View

```bash
hcli account view --account myaccount
hcli account view --account 0.0.123456
```

### Account Delete

Deletes the account on Hedera (default) or only from local CLI state (`--state-only`). Network delete requires a beneficiary for remaining HBAR (`--transfer-id`).

```bash
hcli account delete --account myaccount --transfer-id 0.0.98
hcli account delete --account 0.0.123456 --transfer-id operator-alias
hcli account delete --account myaccount --state-only
```

`account delete` also supports `--batch` / `-B` like `account create`; after `batch execute`, `AccountDeleteBatchStateHook` removes the account from local state.

### Account Clear

```bash
hcli account clear
```

## 📦 Batch Support

The `account create` and `account delete` commands support the `--batch` / `-B` flag via the batch plugin's `batchify` hook. When you pass `--batch <batch-name>`:

1. **No immediate execution** – The transaction is not submitted to the network. Instead, it is serialized and added to the specified batch.
2. **Deferred execution** – Run `hcli batch execute --name <batch-name>` to submit all batched transactions atomically.
3. **State persistence** – After successful batch execution, `AccountCreateBatchStateHook` runs for each account creation in the batch (receipt, EVM address, save to state, aliases). `AccountDeleteBatchStateHook` removes accounts from local state for batched account deletes.

**Example workflow:**

```bash
# 1. Create a batch
hcli batch create --name my-batch --key operator-alias

# 2. Add account creations to the batch
hcli account create --balance 1.0 --name alice --batch my-batch
hcli account create --balance 1.0 --name bob --batch my-batch

# 3. Execute the batch (creates both accounts atomically)
hcli batch execute --name my-batch
```

The `--batch` option is automatically injected by the batchify hook—no need to declare it in the account plugin. See the [Batch Plugin README](../batch/README.md) for full batch documentation.

## 🔧 Core API Integration

The plugin uses the Core API services:

- `api.account` - Account transaction creation
- `api.txExecution` - Transaction signing and execution
- `api.state` - Namespaced state management
- `api.network` - Network information
- `api.kms` - Secure key management
- `api.alias` - Name registration and resolution
- `api.mirror` - Mirror node queries
- `api.receipt` - Transaction receipt retrieval (used by `AccountCreateBatchStateHook`)
- `api.logger` - Logging

## 📤 Output Formatting

All commands return structured output through the `CommandResult` interface:

```typescript
interface CommandResult {
  result: object;
}
```

**Output Structure:**

- **Output Schemas**: Each command defines a Zod schema in `output.ts` for type-safe output validation
- **Human Templates**: Handlebars templates provide human-readable output formatting
- **Error Handling**: All errors are returned in the result structure, ensuring consistent error handling

The `result` field contains a structured object conforming to the Zod schema defined in each command's `output.ts` file, ensuring type safety and consistent output structure.

Example output schema:

```typescript
export const AccountCreateOutputSchema = z.object({
  accountId: EntityIdSchema,
  name: z.string(),
  type: KeyTypeSchema,
  network: NetworkSchema,
  transactionId: TransactionIdSchema,
  evmAddress: EvmAddressSchema,
  publicKey: PublicKeySchema,
});
```

## 📊 State Management

Account data is stored in the `account-accounts` namespace with the following structure:

```typescript
interface AccountData {
  keyRefId: string; // Reference to private key in secure storage
  name: string; // Unique account name
  accountId: string; // Hedera account ID (0.0.xxxxx)
  type: KeyAlgorithm; // Key algorithm (ecdsa or ed25519)
  publicKey: string; // Public key
  evmAddress: string; // EVM address
  network: 'mainnet' | 'testnet' | 'previewnet' | 'localnet';
}
```

The schema is validated using Zod (`AccountDataSchema`) and stored as JSON Schema in the plugin manifest for runtime validation.

## 🔐 Security

- Private keys stored securely via `KmsService` using `keyRefId` references
- Two storage modes available: `local` (plain text) and `local_encrypted` (AES-256-GCM)
- Default storage mode configurable via `hcli config set -o default_key_manager -v local|local_encrypted`
- Per-operation override using `--key-manager` flag
- No raw private keys in plugin state JSON
- Secure key retrieval through Core API
- Keys isolated in credentials storage namespace

## 🏷️ Name Support

- Per-network names via `AliasService`
- Names resolve to account IDs and key references
- Example: `myaccount` → `0.0.123456` on testnet
- Registered during `create` and `import` when `--name` provided

## 🧪 Testing

Unit tests located in `__tests__/unit/`:

```bash
npm test -- src/plugins/account/__tests__/unit
```

Test coverage:

- Account creation (happy path, failures)
- Account creation in batch (batch-create hook)
- Account import with names
- Balance retrieval (HBAR only, with tokens, errors)
- Account listing
- Account view and deletion
- Clear all accounts
