# Batch Plugin

Plugin for creating and executing batches of Hedera transactions following the plugin architecture. Supports grouping multiple inner transactions (token creation, topic creation, account creation, etc.) into a single atomic batch transaction.

## Architecture

This plugin follows the plugin architecture principles:

- **Stateless**: Plugin is functionally stateless
- **Dependency Injection**: Services are injected into command handlers
- **Manifest-Driven**: Capabilities declared via manifest with output specifications
- **Namespace Isolation**: Own state namespace (`batch-batches`)
- **Type Safety**: Full TypeScript support
- **Structured Output**: All command handlers return `CommandResult` with standardized output

## Structure

```
src/plugins/batch/
├── manifest.ts              # Plugin manifest with command definitions and output specs
├── schema.ts                # Batch data schema with Zod validation
├── zustand-state-helper.ts  # State management helper
├── commands/
│   ├── create/
│   │   ├── handler.ts       # Batch creation handler
│   │   ├── input.ts         # Input schema
│   │   ├── output.ts        # Output schema and template
│   │   └── index.ts         # Command exports
│   ├── execute/
│   │   ├── handler.ts       # Batch execution handler
│   │   ├── input.ts         # Input schema
│   │   ├── output.ts        # Output schema and template
│   │   ├── types.ts         # Command types
│   │   └── index.ts         # Command exports
│   ├── list/
│   │   ├── handler.ts       # Batch list handler
│   │   ├── output.ts        # Output schema and template
│   │   └── index.ts         # Command exports
│   └── delete/
│       ├── handler.ts       # Batch delete handler
│       ├── input.ts         # Input schema
│       ├── output.ts        # Output schema and template
│       └── index.ts         # Command exports
├── hooks/
│   └── batchify/
│       ├── handler.ts       # Hook that intercepts commands and adds transactions to batch
│       ├── input.ts         # Input schema
│       ├── output.ts        # Output schema and template
│       ├── types.ts         # Hook types
│       └── index.ts         # Hook exports
├── __tests__/               # Test suite
│   ├── unit/
│   │   ├── create.test.ts
│   │   ├── execute.test.ts
│   │   ├── list.test.ts
│   │   ├── delete.test.ts
│   │   ├── batchify.test.ts
│   │   └── helpers/
│   └── ...
└── index.ts                 # Plugin exports
```

## Commands

All commands return `CommandResult` with structured output data in the `result` field. Errors are thrown as typed `CliError` instances and handled uniformly by the core framework.

### Batch Create

Create a new batch with a name and signing key for transaction execution.

```bash
# Basic usage
hcli batch create --name my-batch --key alice

# With account-id:private-key pair
hcli batch create --name my-batch --key 0.0.123456:302e020100300506032b657004220420...

# With specific key manager
hcli batch create --name my-batch --key alice --key-manager local_encrypted
```

**Parameters:**

- `--name` / `-n`: Name/alias for the batch - **Required**
- `--key` / `-k`: Key to sign transactions - **Required**
  - Account alias: `alice`
  - Account with key: `0.0.123456:privateKey`
  - Key reference or account alias
- `--key-manager` / `-m`: Key manager type (optional, defaults to config setting)
  - `local` or `local_encrypted`

### Batch Execute

Execute a batch by name, signing and submitting its transactions atomically.

```bash
hcli batch execute --name my-batch
```

**Parameters:**

- `--name` / `-n`: Name of the batch to execute - **Required**

**Note:** The batch must have been created first and must contain at least one transaction. After execution, domain-specific hooks (e.g. token, account, topic) persist their state based on the transaction results.

### Batch List

List all available batches.

```bash
hcli batch list
```

**Output:** Shows batch name, transaction count, execution status, and success status for each batch.

### Batch Delete

Delete a whole batch or remove a single transaction from a batch.

```bash
# Delete entire batch
hcli batch delete --name my-batch

# Delete single transaction by order
hcli batch delete --name my-batch --order 3
```

**Parameters:**

- `--name` / `-n`: Name of the batch - **Required**
- `--order` / `-o`: Order of transaction to remove (optional). If omitted, deletes the entire batch

## Usage: Adding Transactions to a Batch

The `batchify` hook intercepts commands that support it. When you pass `--batch <batch-name>` to any command that registers the hook, the transaction is not executed immediately—instead, it is added to the specified batch.

### Supported Commands

Commands that support `--batch` (via `registeredHooks`):

- `account create`
- `topic create`
- `token create-ft`
- `token create-ft-from-file`
- `token create-nft`
- `token create-nft-from-file`
- `token associate`

### Example Workflow

```bash
# 1. Create a batch
hcli batch create --name my-batch --key alice

# 2. Add transactions to the batch (instead of executing immediately)
hcli token create-ft --token-name "Token A" --symbol "TA" --treasury alice --decimals 8 --initial-supply 1000 --supply-type FINITE --max-supply 10000 --admin-key alice --supply-key alice --name token-a --batch my-batch

hcli token create-ft --token-name "Token B" --symbol "TB" --treasury alice --decimals 8 --initial-supply 500 --supply-type INFINITE --admin-key alice --supply-key alice --name token-b --batch my-batch

hcli token associate --token token-a --account bob --batch my-batch

# 3. Optional: list batches to verify
hcli batch list

# 4. Execute the batch (all transactions atomically)
hcli batch execute --name my-batch
```

**Parameters:**

- `--batch` / `-B`: Name of the batch to add the transaction to (optional). When provided, the command does not execute—it adds the transaction to the batch and returns immediately.

### Batch Limits

- Maximum **50 transactions** per batch (Hedera HIP-551 limit)
- Batch must be created before adding transactions
- Batch cannot be modified after execution

## Core API Integration

The plugin uses the Core API services:

- `api.state` - Namespaced state management for batch data
- `api.kms` - Key resolution and signing
- `api.keyResolver` - Resolve signing keys
- `api.network` - Network information and operator
- `api.txSign` - Transaction signing
- `api.txExecute` - Transaction execution
- `api.batch` - Batch transaction creation
- `api.logger` - Logging

## State Management

Batch data is stored in the `batch-batches` namespace with the following structure:

```typescript
interface BatchData {
  name: string;
  keyRefId: string;
  executed: boolean;
  success: boolean;
  transactions: BatchTransactionItem[];
}

interface BatchTransactionItem {
  transactionBytes: string; // Hex-encoded signed transaction
  order: number;
  command: string;
  normalizedParams: Record<string, unknown>;
  transactionId?: string; // Set after execution
}
```

The schema is validated using Zod (`BatchDataSchema`) and stored as JSON Schema in the plugin manifest for runtime validation.

## Hook Architecture

The `batchify` hook is registered in the manifest and declares options (`--batch` / `-B`) that are automatically injected into commands that register it. The hook:

1. **preSignTransactionHook**: When `--batch` is present, sets the batch key on the transaction
2. **preExecuteTransactionHook**: When `--batch` is present, serializes the signed transaction, adds it to the batch state, and returns `breakFlow: true` to prevent execution

Domain plugins (token, account, topic) register hooks that run during `outputPreparation` of the batch execute command to persist their state (e.g. saving newly created token IDs) after successful batch execution.

## Output Formatting

All commands return structured output through the `CommandResult` interface. Each command defines a Zod schema in `output.ts` for type-safe output validation and a Handlebars template for human-readable formatting.

### Human-Readable (Default)

**Batch Create:**

```
✅ Batch created successfully
   Name: my-batch
   Batch Key Reference ID: key-ref-123
```

**Batch Execute:**

```
✅ Batch executed successfully
   Batch: my-batch
   Transaction ID: 0.0.123@1700000000.123456789
   Success: true
```

**Batchify (Add to Batch):**

```
✅ Transaction added to batch successfully
   Batch: my-batch
   Transaction order in batch: 1
```

### JSON Output

Output format is controlled by the CLI's `--format` option (default: `human`, or `json` for machine-readable output).

## Testing

The plugin includes unit tests for:

- **Create**: Batch creation, validation, duplicate name handling
- **Execute**: Batch execution flow, transaction ordering, state updates
- **List**: Listing batches with correct metadata
- **Delete**: Whole batch deletion, single transaction removal
- **Batchify**: Hook interception, transaction collection, batch size limits
