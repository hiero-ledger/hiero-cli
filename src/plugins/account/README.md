# Account Plugin

Complete account management plugin for the Hedera CLI following the plugin architecture.

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
│   │   ├── output.ts       # Output schema and template
│   │   └── index.ts        # Command exports
│   ├── import/
│   │   ├── handler.ts      # Account import handler
│   │   ├── output.ts       # Output schema and template
│   │   └── index.ts        # Command exports
│   ├── balance/
│   │   ├── handler.ts      # Balance retrieval handler
│   │   ├── output.ts       # Output schema and template
│   │   └── index.ts        # Command exports
│   ├── list/
│   │   ├── handler.ts      # List accounts handler
│   │   ├── output.ts       # Output schema and template
│   │   └── index.ts        # Command exports
│   ├── view/
│   │   ├── handler.ts      # View account details handler
│   │   ├── output.ts       # Output schema and template
│   │   └── index.ts        # Command exports
│   ├── delete/
│   │   ├── handler.ts      # Delete account handler
│   │   ├── output.ts       # Output schema and template
│   │   └── index.ts        # Command exports
│   └── clear/
│       ├── handler.ts      # Clear all accounts handler
│       ├── output.ts       # Output schema and template
│       └── index.ts        # Command exports
├── zustand-state-helper.ts  # State management helper
├── __tests__/unit/          # Unit tests
└── index.ts                # Plugin exports
```

## 🚀 Commands

All commands return `CommandExecutionResult` with structured output that includes:

- `status`: Success or failure status
- `errorMessage`: Optional error message (present when status is not 'success')
- `outputJson`: JSON string conforming to the output schema defined in `output.ts`

Each command defines a Zod schema for output validation and a Handlebars template for human-readable formatting.

### Account Create

```bash
hcli account create \
  --balance 100000000 \
  --auto-associations 10 \
  --name myaccount \
  --payer operator-name
```

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

```bash
hcli account delete --name myaccount
hcli account delete --id 0.0.123456
```

### Account Clear

```bash
hcli account clear
```

## 🔧 Core API Integration

The plugin uses the Core API services:

- `api.account` - Account transaction creation
- `api.txExecution` - Transaction signing and execution
- `api.state` - Namespaced state management
- `api.network` - Network information
- `api.kms` - Secure key management
- `api.alias` - Name registration and resolution
- `api.mirror` - Mirror node queries
- `api.logger` - Logging

## 📤 Output Formatting

All commands return structured output through the `CommandExecutionResult` interface:

```typescript
interface CommandExecutionResult {
  status: 'success' | 'failure';
  errorMessage?: string; // Present when status !== 'success'
  outputJson?: string; // JSON string conforming to the output schema
}
```

**Output Structure:**

- **Output Schemas**: Each command defines a Zod schema in `output.ts` for type-safe output validation
- **Human Templates**: Handlebars templates provide human-readable output formatting
- **Error Handling**: All errors are returned in the result structure, ensuring consistent error handling

The `outputJson` field contains a JSON string that conforms to the Zod schema defined in each command's `output.ts` file, ensuring type safety and consistent output structure.

Example output schema:

```typescript
export const CreateAccountOutputSchema = z.object({
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
- Account import with names
- Balance retrieval (HBAR only, with tokens, errors)
- Account listing
- Account view and deletion
- Clear all accounts
