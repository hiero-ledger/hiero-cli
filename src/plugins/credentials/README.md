# Credentials Plugin

A plugin for managing operator credentials and keys in the Hedera CLI.

## Features

- **List Credentials**: View all stored credentials and their metadata
- **Remove Credentials**: Delete stored credentials by key reference ID
- **ADR-003 Compliant**: Structured outputs with human-readable templates and machine-readable formats

## Commands

### `hedera credentials list`

Show all stored credentials and their metadata.

**Example:**

```bash
hedera credentials list
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

**Options:**

- `--id, -i` (required): Key reference ID to remove

**Example:**

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

### Output Schemas

All commands follow ADR-003 with:

- **Zod schemas** for runtime validation
- **Human-readable templates** using Handlebars
- **Machine-readable outputs** (JSON/YAML/XML support)
- **Type-safe interfaces** auto-generated from schemas

### Error Handling

- Structured error responses with `CommandExecutionResult`
- Consistent error messages via `formatError()` utility
- Graceful handling of missing credentials or invalid inputs

## Integration

The credentials plugin integrates with:

- **KMS Service**: Secure key storage and management
- **Network Service**: Operator configuration per network
- **State Service**: Persistent credential metadata storage
- **Core API**: Transaction signing and execution

## Security Notes

- Private keys are stored securely via the KMS service
- Only key reference IDs and public keys are exposed in outputs
- Network-specific operator configuration prevents key reuse across environments
- Credentials are encrypted at rest and never logged in plaintext
