# HBAR Plugin

Complete HBAR transfer management plugin for the Hedera CLI following the plugin architecture.

## 🏗️ Architecture

This plugin follows the plugin architecture principles:

- **Stateless**: Plugin is functionally stateless
- **Dependency Injection**: Services are injected into command handlers
- **Manifest-Driven**: Capabilities declared via manifest with output specifications
- **Structured Output**: All command handlers return `CommandExecutionResult` with standardized output
- **SDK Isolation**: All Hedera SDK code in Core API
- **Type Safety**: Full TypeScript support

## 📁 Structure

```
src/plugins/hbar/
├── manifest.ts              # Plugin manifest with command definitions
├── schema.ts                # Transfer input schema with Zod validation
├── commands/
│   └── transfer/
│       ├── handler.ts      # HBAR transfer handler
│       ├── output.ts       # Output schema and template
│       └── index.ts        # Command exports
├── __tests__/unit/
│   └── transfer.test.ts    # Unit tests
└── index.ts                # Plugin exports
```

## 🚀 Commands

All commands return `CommandExecutionResult` with structured output that includes:

- `status`: Success or failure status
- `errorMessage`: Optional error message (present when status is not 'success')
- `outputJson`: JSON string conforming to the output schema defined in `output.ts`

Each command defines a Zod schema for output validation and a Handlebars template for human-readable formatting.

### HBAR Transfer

Transfer HBAR between accounts with support for names, account IDs, and account-id:private-key pairs.

```bash
# Using account names
hcli hbar transfer \
  --amount 1 \
  --from alice \
  --to bob \
  --memo "Payment"

# Using account-id:private-key pair for sender
hcli hbar transfer \
  --amount 100t \
  --from 0.0.123456:302e020100300506032b657004220420... \
  --to 0.0.789012

# Using operator from the cli state as sender (when --from is omitted)
hcli hbar transfer \
  --amount 0.5 \
  --to myaccount
```

**Options:**

- `-a, --amount <string>` - Amount in HBAR (display units by default, add "t" for tinybar). Example: "1" = 1 HBAR, "100t" = 100 tinybar (required)
- `-t, --to <string>` - Recipient account ID or name (required)
- `-f, --from <string>` - Sender account: either an account-id:private-key pair or account name (optional, defaults to operator)
- `-m, --memo <string>` - Transfer memo (optional)

**Examples:**

```bash
# Transfer using names
hcli hbar transfer -a 1000000 -f alice -t bob

# Transfer using account IDs
hcli hbar transfer -a 5000000 -f 0.0.123456 -t 0.0.789012

# Transfer from operator account
hcli hbar transfer -a 100000 -t myaccount
```

## 🔧 Core API Integration

The plugin uses the Core API services:

- `api.hbar` - HBAR transfer operations
- `api.txExecution` - Transaction signing and execution
- `api.kms` - Secure key management
- `api.alias` - Name resolution
- `api.state` - Account lookup in state
- `api.network` - Network information
- `api.logger` - Logging

## 🔐 Signing Flow

The plugin intelligently determines which key to use for signing:

1. **Account-id:private-key pair** - Imports the key and uses it for signing
2. **Name with keyRefId** - Uses registered key for the name via alias service
3. **Account in state** - Looks up account by ID or name, uses its keyRefId
4. **Default operator** - Falls back to operator credentials from network configuration

This ensures transfers are signed with the correct key for the sender account.

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

## 🧪 Testing

Unit tests located in `__tests__/unit/transfer.test.ts`:

```bash
npm test -- src/plugins/hbar/__tests__/unit
```

Test coverage (71%):

- HBAR transfer success (all params provided)
- Balance validation (NaN, negative, zero)
- Missing from/to accounts
- Transfer to same account
- Transfer failures
- Default credentials fallback

## 🎯 Key Features

- **Multi-format support**: Accepts names, account IDs, or account-id:private-key pairs
- **Smart key resolution**: Automatically finds correct signing key
- **Default operator fallback**: Uses network operator credentials when sender not specified
- **Name integration**: Works seamlessly with alias service
- **Secure signing**: Leverages `keyRefId` system for key management
- **Flexible balance input**: Supports display units (HBAR) or base units (tinybar with "t" suffix)

## 📝 Technical Details

### Account Resolution Priority

When resolving `--from` or `--to`:

1. **Account-id:private-key pair** - Parse and import the key
2. Try name lookup via `api.alias.resolve()`
3. Try account name in `account-accounts` state
4. Try account ID in `account-accounts` state
5. Use as raw account ID (operator will sign if `--from` not provided)

### Signing Logic

The handler determines the signing key based on the `--from` parameter:

- If `--from` is an account-id:private-key pair, the key is imported and used
- If `--from` is a name, the key is resolved via alias service or state lookup
- If `--from` is omitted, the operator key from network configuration is used
