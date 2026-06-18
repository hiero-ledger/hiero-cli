# Credentials Plugin

A plugin for generating, importing, listing, and removing standalone private keys (key credentials) in the Hiero CLI KMS.

## 🏗️ Architecture

This plugin follows the plugin architecture principles:

- **Stateless**: Plugin is functionally stateless
- **Dependency Injection**: Services are injected into command handlers
- **Manifest-Driven**: Capabilities declared via manifest with output specifications
- **Structured Output**: All command handlers return `CommandResult` with standardized output
- **Type Safety**: Full TypeScript support

## 📁 Structure

```
src/plugins/credentials/
├── manifest.ts              # Plugin manifest with command definitions
├── commands/
│   ├── generate/
│   │   ├── handler.ts      # Generate key handler
│   │   ├── input.ts        # Input schema
│   │   ├── output.ts       # Output schema and template
│   │   └── index.ts        # Command exports
│   ├── import/
│   │   ├── handler.ts      # Import key handler
│   │   ├── input.ts        # Input schema
│   │   ├── output.ts       # Output schema and template
│   │   └── index.ts        # Command exports
│   ├── list/
│   │   ├── handler.ts      # List credentials handler
│   │   ├── output.ts       # Output schema and template
│   │   └── index.ts        # Command exports
│   └── remove/
│       ├── handler.ts      # Remove credentials handler
│       ├── input.ts        # Input schema
│       ├── output.ts       # Output schema and template
│       └── index.ts        # Command exports
├── __tests__/unit/         # Unit tests
└── index.ts                # Plugin exports
```

## 🚀 Commands

All commands return `CommandResult` with structured output data in the `result` field. Errors are thrown as typed `CliError` instances and handled uniformly by the core framework.

Each command defines a Zod schema for output validation and a Handlebars template for human-readable formatting.

### Generate Key

Generate a new private key in KMS, optionally linked to a key alias.

```bash
hcli credentials generate
hcli credentials generate --alias my-signing-key --key-type ed25519 --key-manager local_encrypted
```

**Options:**

| Option          | Short | Required | Description                                   |
| --------------- | ----- | -------- | --------------------------------------------- |
| `--alias`       | `-a`  | no       | Human-readable alias to assign to this key    |
| `--key-type`    | `-t`  | no       | Key algorithm: `ecdsa` (default) or `ed25519` |
| `--key-manager` | `-k`  | no       | Storage method: `local` or `local_encrypted`  |

**Output:**

```json
{
  "keyRefId": "kr_abc123",
  "publicKey": "02a1b2c3...",
  "keyAlgorithm": "ecdsa",
  "keyManager": "local",
  "alias": "my-signing-key",
  "network": "testnet"
}
```

### Import Key

Import an existing private key into KMS, optionally linked to a key alias.

```bash
hcli credentials import --key ecdsa:private:abc123... --alias my-key
hcli credentials import --key 0.0.123456:302e... --key-manager local_encrypted
```

**Options:**

| Option          | Short | Required | Description                                                                                             |
| --------------- | ----- | -------- | ------------------------------------------------------------------------------------------------------- |
| `--key`         | `-K`  | **yes**  | Key to import. Accepts: `{accountId}:{privateKey}`, `{ed25519\|ecdsa}:private:{hex}`, key ref, or alias |
| `--alias`       | `-a`  | no       | Alias to assign to this key                                                                             |
| `--key-manager` | `-k`  | no       | Storage method: `local` or `local_encrypted` (defaults to config setting)                               |

**Output:**

```json
{
  "keyRefId": "kr_abc123",
  "publicKey": "02a1b2c3...",
  "keyManager": "local",
  "alias": "my-key",
  "network": "testnet"
}
```

### List Credentials

Show all stored credentials and their metadata, including any linked key alias on the current network.

```bash
hcli credentials list
```

**Output:**

```json
{
  "credentials": [
    {
      "keyRefId": "kr_abc123",
      "keyManager": "local",
      "publicKey": "02a1b2c3...",
      "keyAlgorithm": "ecdsa",
      "alias": "my-signing-key",
      "labels": ["credentials:generate"]
    }
  ],
  "totalCount": 1
}
```

### Remove Credentials

Remove credentials by key reference ID or alias. Exactly one of `--id` or `--alias` must be provided.

Removing by `--id` also unregisters any key alias on the current network that points to that key reference, preventing dangling alias references.

```bash
hcli credentials remove --id kr_abc123 --confirm
hcli credentials remove --alias my-signing-key --confirm
```

⚠️ Requires confirmation. Use `--confirm` (`-Y`) to skip the prompt.

**Options:**

| Option    | Short | Required    | Description                                      |
| --------- | ----- | ----------- | ------------------------------------------------ |
| `--id`    | `-i`  | one of both | Key reference ID to remove from KMS              |
| `--alias` | `-a`  | one of both | Key alias to remove (also unregisters the alias) |

**Output:**

```json
{
  "keyRefId": "kr_abc123"
}
```

## 🔑 Key Aliases

The `generate` and `import` commands support an optional `--alias` flag that registers a **key alias** (`AliasType.Key`) in the alias store, scoped to the current network. Key aliases allow you to reference a key by a human-readable name instead of a `kr_xxx` key reference ID in any command that accepts keys.

Key aliases are separate from account aliases (`AliasType.Account`). A key alias has no associated Hedera account ID — it is purely a named pointer to a KMS key reference.

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
- **Error Handling**: All errors are thrown as typed `CliError` instances
- **Format Selection**: Output format is controlled by the CLI's `--format` option (default: `human`, or `json` for machine-readable output)

## 🔧 Core API Integration

The plugin uses the Core API services:

- `api.kms` - Secure key storage, management, and key generation
- `api.alias` - Key alias registration and resolution
- `api.keyResolver` - Resolving key inputs to KMS-stored key references
- `api.network` - Current network context for alias scoping
- `api.config` - Default key manager configuration
- `api.logger` - Logging

## 🔐 Security Notes

- Private keys are stored securely via the KMS service using one of two storage modes:
  - **`local`**: Plain text storage (development/testing)
  - **`local_encrypted`**: AES-256-GCM encrypted storage (production)
- Default storage mode configured via `hcli config set --default_key_manager local|local_encrypted`
- Per-operation override available using `--key-manager` flag on `generate` and `import`
- Only key reference IDs and public keys are exposed in outputs
- Private keys never logged in plaintext
- Alias availability is validated before key creation to prevent orphaned keys from a taken alias name

## 🧪 Testing

Unit tests located in `__tests__/unit/`:

```bash
npm test -- src/plugins/credentials/__tests__/unit
```

Test coverage includes:

- Generating new key credentials
- Importing existing keys
- Listing credentials with alias resolution
- Removing credentials by key reference ID
- Removing credentials by alias
- Error handling for invalid inputs and missing credentials
