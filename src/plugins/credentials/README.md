# Credentials Plugin

A plugin for managing operator credentials and keys in the Hiero CLI.

## 🏗️ Architecture

This plugin follows the plugin architecture principles:

- **Stateless**: Plugin is functionally stateless
- **Dependency Injection**: Services are injected into command handlers
- **Manifest-Driven**: Capabilities declared via manifest with output specifications
- **Structured Output**: All command handlers return `CommandExecutionResult` with standardized output
- **Type Safety**: Full TypeScript support

## 📁 Structure

```
src/plugins/credentials/
├── manifest.ts              # Plugin manifest with command definitions
├── schema.ts                # Credentials data schema with Zod validation
├── commands/
│   ├── list/
│   │   ├── handler.ts      # List credentials handler
│   │   ├── output.ts       # Output schema and template
│   │   └── index.ts        # Command exports
│   └── remove/
│       ├── handler.ts      # Remove credentials handler
│       ├── output.ts       # Output schema and template
│       └── index.ts        # Command exports
├── __tests__/unit/         # Unit tests
└── index.ts                # Plugin exports
```

## 🚀 Commands

All commands return `CommandExecutionResult` with structured output that includes:

- `status`: Success or failure status
- `errorMessage`: Optional error message (present when status is not 'success')
- `outputJson`: JSON string conforming to the output schema defined in `output.ts`

Each command defines a Zod schema for output validation and a Handlebars template for human-readable formatting.

### List Credentials

Show all stored credentials and their metadata.

```bash
hcli credentials list
```

**Output:**

```json
{
  "credentials": [
    {
      "keyRefId": "key-ref-123",
      "type": "ecdsa",
      "publicKey": "02a1b2c3...",
      "labels": ["default-operator"]
    }
  ],
  "totalCount": 1
}
```

### `hedera credentials remove`

Remove credentials for a specific key reference ID.

```bash
hcli credentials remove --key-ref-id key-ref-123
```

**Options:**

- `--id, -i` (required): Key reference ID to remove

## 📊 State Management

```bash
hedera credentials remove --id key-ref-123
```

**Output:**

```json
{
  "keyRefId": "key-ref-123",
  "removed": true
}
```

## Plugin Architecture

### State Management

The plugin stores credentials metadata using the following schema:

```typescript
{
  accountId: string; // Format: 0.0.123456
  privateKey: string; // Encrypted private key
  network: string; // mainnet|testnet|previewnet|localnet
  isDefault: boolean; // Whether this is the default credential set
  createdAt: string; // ISO timestamp
}
```

The schema is validated using Zod (`CredentialsDataSchema`) and stored as JSON Schema in the plugin manifest for runtime validation.

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
- **Format Selection**: Output format is controlled by the CLI's `--format` option (default: `human`, or `json` for machine-readable output)

The `outputJson` field contains a JSON string that conforms to the Zod schema defined in each command's `output.ts` file, ensuring type safety and consistent output structure.

## 🔧 Core API Integration

The plugin uses the Core API services:

- `api.kms` - Secure key storage and management
- `api.network` - Operator configuration per network
- `api.state` - Persistent credential metadata storage
- `api.logger` - Logging

## 🔐 Security Notes

- Private keys are stored securely via the KMS service using one of two storage modes:
  - **`local`**: Plain text storage (development/testing)
  - **`local_encrypted`**: AES-256-GCM encrypted storage (production)
- Default storage mode configured via `hcli config set -o default_key_manager local|local_encrypted`
- Per-operation override available using `--key-manager` flag on commands that import or create keys
- Only key reference IDs and public keys are exposed in outputs
- Network-specific operator configuration prevents key reuse across environments
- Private keys never logged in plaintext

## 🧪 Testing

Unit tests located in `__tests__/unit/`:

```bash
npm test -- src/plugins/credentials/__tests__/unit
```

Test coverage includes:

- Listing credentials
- Removing credentials by key reference ID
- Error handling for invalid inputs
- Missing credentials handling
