# Output Schemas Guide

This document describes the output schema system for command handlers and CLI output control.

## Overview

All plugin commands now define their output structure using **Zod schemas** (converted to JSON Schema) and provide optional human-readable templates. This enables:

- **Consistent output formats** across all commands
- **Machine-readable outputs** (JSON, YAML, XML)
- **Human-readable outputs** with customizable templates
- **Runtime validation** with detailed error messages
- **Type safety** with automatic TypeScript inference
- **Documentation generation** from schemas

## Architecture

### 1. Common Schemas

Location: `src/core/schemas/common-schemas.ts`

This file contains reusable **Zod schemas** for common Hedera data types, with automatic JSON Schema conversion. The schemas provide both runtime validation and TypeScript type inference:

#### Available Zod Schemas

- `EntityIdSchema` - Hedera entity ID pattern
- `TimestampSchema` - Hedera timestamp format
- `TransactionIdSchema` - Transaction ID format
- `TokenAmountSchema` - Token amount with int64 validation
- `TokenBalanceSchema` - Token balance with metadata
- `TinybarBalanceSchema` - Tinybar balance with int64 validation
- `EvmAddressSchema` - EVM-compatible address
- `PublicKeySchema` - Public key (ECDSA/ED25519)
- `NetworkSchema` - Hedera network names
- `KeyTypeSchema` - Cryptographic key types
- `SupplyTypeSchema` - Token supply types
- `IsoTimestampSchema` - ISO 8601 timestamps
- `AccountDataSchema` - Complete account information
- `TokenDataSchema` - Complete token information
- `TopicDataSchema` - Complete topic information
- `TransactionResultSchema` - Transaction execution results

#### TypeScript Types

All schemas automatically generate TypeScript types:

- `EntityId`, `Timestamp`, `TransactionId`
- `TokenAmount`, `TokenBalance`, `TinybarBalance`, `EvmAddress`
- `PublicKey`, `Network`, `KeyType`, `SupplyType`
- `IsoTimestamp`, `AccountData`, `TokenData`
- `TopicData`, `TransactionResult`

#### Schema Exports Available

The `common-schemas.ts` file exports Zod schemas for runtime validation and TypeScript:

- `EntityIdSchema`, `TimestampSchema`, `TransactionIdSchema`
- `TokenAmountSchema`, `TokenBalanceSchema`, `TinybarBalanceSchema`, `EvmAddressSchema`
- `PublicKeySchema`, `NetworkSchema`, `KeyTypeSchema`
- `SupplyTypeSchema`, `IsoTimestampSchema`, `AccountDataSchema`
- `TokenDataSchema`, `TopicDataSchema`, `TransactionResultSchema`

**Note**: JSON schemas are generated on-demand for specific use cases (like plugin state schemas) but are not pre-exported from common schemas.

#### Entity ID

- **Pattern**: `0.0.{number}`
- **Example**: `0.0.12345`
- **Usage**: Account IDs, Token IDs, Topic IDs

#### Timestamp

- **Pattern**: `{seconds}.{nanoseconds}`
- **Example**: `1700000000.123456789`
- **Usage**: Hedera consensus timestamps

#### Transaction ID

- **Pattern**: `{accountId}@{timestamp}`
- **Example**: `0.0.123@1700000000.123456789`
- **Usage**: Transaction identifiers

#### Token Balance

- **Structure**:
  ```json
  {
    "baseUnitAmount": 105000,
    "name": "USDT",
    "decimals": 4
  }
  ```
- **Usage**: Token balance with denomination information
- **Note**: `baseUnitAmount` uses `TokenAmountSchema` for int64 validation

#### Token Amount

- **Type**: BigInt or string (base units)
- **Example**: `1000000n` or `"1000000"` (1,000,000 base units)
- **Validation**: Accepts both BigInt and numeric strings, validates int64 range
- **Usage**: Individual token amounts in base units

#### Tinybar Balance

- **Type**: BigInt or string (tinybars)
- **Example**: `10000000n` or `"10000000"` (0.1 HBAR)
- **Validation**: Accepts both BigInt and numeric strings, validates int64 range
- **Note**: 1 HBAR = 100,000,000 tinybars

#### EVM Address

- **Pattern**: `0x{40 hex chars}`
- **Example**: `0x1234567890123456789012345678901234567890`

#### Public Key

- **Pattern**: Hexadecimal string (64-132 chars)
- **Example**: ECDSA or ED25519 public key

#### Network

- **Enum**: `mainnet`, `testnet`, `previewnet`, `localnet`

#### Key Type

- **Enum**: `ECDSA`, `ED25519`

#### Supply Type

- **Enum**: `FINITE`, `INFINITE`

### 2. Plugin Manifest Updates

Each plugin manifest now includes `output` specifications for commands. Use Zod schemas directly (recommended) or generate JSON schemas on-demand:

#### Using Zod Schemas (Recommended)

```typescript
import { EntityIdSchema, NetworkSchema, KeyTypeSchema } from '../../core/schemas/common-schemas';
import { z } from 'zod';

// Define your output schema using Zod
const CreateAccountOutputSchema = z.object({
  accountId: EntityIdSchema,
  name: z.string(),
  type: KeyTypeSchema,
  network: NetworkSchema,
  // ... more properties ...
});

{
  name: 'create',
  summary: 'Create a new account',
  // ... options ...
  handler: './index',
  output: {
    schema: CreateAccountOutputSchema, // Use Zod schema directly
    humanTemplate: '✅ Account created: {{accountId}}\n   Name: {{name}}'
  }
}
```

**Note**: `CommandOutputSpec` now only accepts Zod schemas (`z.ZodTypeAny`). JSON schemas are generated on-demand for specific use cases (like plugin state schemas) but are not used in command output specifications.

### 3. Command Output Specification

The `CommandOutputSpec` interface:

```typescript
import { z } from 'zod';

interface CommandOutputSpec {
  schema: z.ZodTypeAny; // Zod schema for validation
  humanTemplate?: string; // Optional Handlebars template
}
```

## Plugin Command Outputs

### Account Plugin

#### `account create`

**Output**:

```json
{
  "accountId": "0.0.12345",
  "name": "my-account",
  "type": "ECDSA",
  "alias": "test-account",
  "network": "testnet",
  "transactionId": "0.0.123@1700000000.123456789",
  "evmAddress": "0x...",
  "publicKey": "02a1b2..."
}
```

#### `account balance`

**Output**:

```json
{
  "accountId": "0.0.12345",
  "hbarBalance": "10000000",
  "tokenBalances": [
    {
      "tokenId": "0.0.67890",
      "balance": "1000",
      "decimals": 2
    }
  ]
}
```

#### `account list`

**Output**:

```json
{
  "accounts": [
    {
      "name": "account-1",
      "accountId": "0.0.12345",
      "type": "ECDSA",
      "network": "testnet",
      "evmAddress": "0x...",
      "keyRefId": "key-ref-123"
    }
  ],
  "count": 1
}
```

#### `account view`

**Output**:

```json
{
  "accountId": "0.0.12345",
  "balance": "10000000",
  "evmAddress": "0x...",
  "publicKey": "02a1b2...",
  "balanceTimestamp": "1700000000.123456789"
}
```

#### `account delete`

**Output**:

```json
{
  "name": "my-account",
  "accountId": "0.0.12345",
  "deleted": true
}
```

#### `account clear`

**Output**:

```json
{
  "cleared": true,
  "count": 5
}
```

#### `account import`

**Output**:

```json
{
  "accountId": "0.0.12345",
  "name": "imported-account",
  "alias": "test",
  "imported": true
}
```

### Token Plugin

#### `token create`

**Output**:

```json
{
  "tokenId": "0.0.67890",
  "name": "MyToken",
  "symbol": "MTK",
  "treasuryId": "0.0.12345",
  "decimals": 2,
  "initialSupply": "1000000",
  "supplyType": "INFINITE",
  "transactionId": "0.0.123@1700000000.123456789",
  "alias": "my-token"
}
```

#### `token transfer`

**Output**:

```json
{
  "transactionId": "0.0.123@1700000000.123456789",
  "tokenId": "0.0.67890",
  "from": "0.0.12345",
  "to": "0.0.54321",
  "amount": "100"
}
```

#### `token associate`

**Output**:

```json
{
  "transactionId": "0.0.123@1700000000.123456789",
  "accountId": "0.0.12345",
  "tokenId": "0.0.67890",
  "associated": true
}
```

#### `token list`

**Output**:

```json
{
  "tokens": [
    {
      "tokenId": "0.0.67890",
      "name": "MyToken",
      "symbol": "MTK",
      "decimals": 2,
      "supplyType": "INFINITE",
      "treasuryId": "0.0.12345",
      "network": "testnet",
      "keys": {
        "adminKey": "02a1b2...",
        "supplyKey": null
      }
    }
  ],
  "count": 1,
  "network": "testnet"
}
```

### Topic Plugin

#### `topic create`

**Output**:

```json
{
  "topicId": "0.0.13579",
  "name": "my-topic",
  "memo": "Test topic",
  "network": "testnet",
  "transactionId": "0.0.123@1700000000.123456789",
  "hasAdminKey": true,
  "hasSubmitKey": false
}
```

#### `topic list`

**Output**:

```json
{
  "topics": [
    {
      "topicId": "0.0.13579",
      "name": "my-topic",
      "memo": "Test topic",
      "network": "testnet",
      "createdAt": "2024-10-20T12:34:56.789Z",
      "hasAdminKey": true,
      "hasSubmitKey": false
    }
  ],
  "count": 1,
  "stats": {
    "total": 1,
    "withAdminKey": 1,
    "withSubmitKey": 0,
    "withMemo": 1,
    "byNetwork": {
      "testnet": 1
    }
  }
}
```

#### `topic submit-message`

**Output**:

```json
{
  "transactionId": "0.0.123@1700000000.123456789",
  "topicId": "0.0.13579",
  "sequenceNumber": "123",
  "message": "Hello, world!"
}
```

#### `topic find-message`

**Output**:

```json
{
  "topicId": "0.0.13579",
  "messages": [
    {
      "sequenceNumber": "123",
      "consensusTimestamp": "1700000000.123456789",
      "message": "Hello, world!",
      "payerAccountId": "0.0.12345"
    }
  ],
  "count": 1
}
```

### HBAR Plugin

#### `hbar transfer`

**Output**:

```json
{
  "transactionId": "0.0.123@1700000000.123456789",
  "from": "0.0.12345",
  "to": "0.0.54321",
  "amount": "10000000",
  "memo": "Payment for services"
}
```

### Network Plugin

#### `network list`

**Output**:

```json
{
  "networks": [
    {
      "name": "testnet",
      "active": true,
      "configured": true,
      "health": {
        "status": "healthy",
        "lastChecked": "2024-10-20T12:34:56.789Z"
      }
    },
    {
      "name": "mainnet",
      "active": false,
      "configured": true,
      "health": {
        "status": "healthy",
        "lastChecked": "2024-10-20T12:30:00.000Z"
      }
    }
  ],
  "currentNetwork": "testnet",
  "count": 2
}
```

#### `network use`

**Output**:

```json
{
  "previousNetwork": "testnet",
  "currentNetwork": "mainnet",
  "switched": true
}
```

## Human-Readable Templates

Templates use [Handlebars](https://handlebarsjs.com/) syntax:

### Basic Variable Interpolation

```handlebars
✅ Account created: {{accountId}}
```

### Conditional Rendering

```handlebars
{{#if alias}}
  Alias:
  {{alias}}
{{/if}}
```

### Array Iteration

```handlebars
{{#each accounts}}
  {{@index}}.
  {{name}}
  -
  {{accountId}}
{{/each}}
```

### Nested Properties

```handlebars
Balance: {{balance.amount}} {{balance.unit}}
```

## Usage in CLI (Future Implementation)

Commands support multiple output formats:

```bash
# Human-readable output (default)
hedera account create --name my-account

# JSON output
hedera account create --name my-account --format json

# YAML output
hedera account create --name my-account --format yaml

# Save to file
hedera account list --output accounts.json --format json

# Script mode (suppress handler logs)
hedera account create --name my-account --script
```

## Adding New Output Schemas

### Step 1: Use Common Zod Schemas (Recommended)

```typescript
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  EntityIdSchema,
  TransactionIdSchema,
  NetworkSchema,
  // ... other schemas
} from '../../core/schemas/common-schemas';

// Define your output schema using Zod
const MyCommandOutputSchema = z.object({
  entityId: EntityIdSchema,
  customField: z.string().describe('My custom field'),
  network: NetworkSchema,
  transactionId: TransactionIdSchema.optional(),
});

// Convert to JSON Schema for manifest
const MY_COMMAND_OUTPUT_SCHEMA = zodToJsonSchema(MyCommandOutputSchema);

// Use in manifest
{
  name: 'my-command',
  // ... options ...
  output: {
    schema: MyCommandOutputSchema, // Use Zod schema directly
    humanTemplate: 'Result: {{entityId}}\nCustom: {{customField}}'
  }
}
```

### Step 1 (Alternative): Generate JSON Schemas On-Demand (Legacy)

```typescript
import { zodToJsonSchema } from 'zod-to-json-schema';
import { EntityIdSchema, NetworkSchema, TransactionIdSchema } from '../../core/schemas/common-schemas';
import { z } from 'zod';

// Generate JSON schemas on-demand
const ENTITY_ID_JSON_SCHEMA = zodToJsonSchema(EntityIdSchema);
const NETWORK_JSON_SCHEMA = zodToJsonSchema(NetworkSchema);
const TRANSACTION_ID_JSON_SCHEMA = zodToJsonSchema(TransactionIdSchema);

{
  name: 'my-command',
  // ... options ...
  output: {
    schema: {
      type: 'object',
      properties: {
        entityId: ENTITY_ID_JSON_SCHEMA,
        network: NETWORK_JSON_SCHEMA,
        customField: {
          type: 'string',
          description: 'My custom field'
        },
        transactionId: TRANSACTION_ID_JSON_SCHEMA
      },
      required: ['entityId', 'network']
    },
    humanTemplate: 'Result: {{entityId}}\nCustom: {{customField}}'
  }
}
```

**Note**: JSON schemas are now generated on-demand using `zodToJsonSchema()` from the Zod schemas. The individual JSON schema exports (`ENTITY_ID_SCHEMA`, etc.) are no longer available from `common-schemas.ts`.

### Step 2: Runtime Validation (Optional)

```typescript
import { MyCommandOutputSchema } from './output';
import { Status } from '../../core/shared/constants';

export async function myCommandHandler(args: CommandHandlerArgs) {
  // ... command logic ...

  const result = {
    entityId: '0.0.12345',
    customField: 'value',
    network: 'testnet',
  };

  // Validate output against schema (optional)
  try {
    const validatedResult = MyCommandOutputSchema.parse(result);
    return {
      status: Status.Success,
      outputJson: JSON.stringify(validatedResult),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Output validation failed:', error.errors);
      throw new Error('Invalid output format');
    }
    throw error;
  }
}
```

### Step 3: TypeScript Types

```typescript
// Automatically inferred from Zod schema
export type MyCommandOutput = z.infer<typeof MyCommandOutputSchema>;

// Use in your handler
function processOutput(output: MyCommandOutput) {
  // TypeScript knows the exact shape of output
  console.log(output.entityId); // string
  console.log(output.network); // 'mainnet' | 'testnet' | 'previewnet' | 'localnet'
}
```

## Best Practices

1. **Use Zod Schemas**: Prefer Zod schemas over raw JSON schemas for better type safety and validation
2. **Reuse Common Schemas**: Use predefined schemas from `common-schemas.ts` whenever possible
3. **Runtime Validation**: Use Zod's `.parse()` method for runtime validation with detailed error messages
4. **Type Inference**: Leverage `z.infer<typeof Schema>` for automatic TypeScript type generation
5. **Keep Templates Simple**: Focus on essential information in human templates
6. **Include Descriptions**: Add meaningful descriptions to all schema properties using `.describe()`
7. **Handle Optional Fields**: Use `.optional()` or `.nullable()` for optional fields
8. **Validate Patterns**: Use regex patterns for structured data (IDs, timestamps, etc.)
9. **Document Examples**: Include examples in schema descriptions
10. **Consistent Formatting**: Follow established emoji and formatting conventions
11. **Error Handling**: Always handle Zod validation errors gracefully

## Schema Validation

The CLI (when implemented) will:

1. Parse `outputJson` from command handlers
2. Validate against the declared schema (Zod or JSON Schema)
3. Reject invalid outputs with a distinct exit code
4. Format valid outputs according to `--format` flag

### Runtime Validation with Zod

```typescript
import { z } from 'zod';
import {
  EntityIdSchema,
  NetworkSchema,
} from '../../core/schemas/common-schemas';

// Define schema
const MyOutputSchema = z.object({
  accountId: EntityIdSchema,
  network: NetworkSchema,
  balance: z.bigint().describe('Balance in base units'),
});

// Validate data
try {
  const result = MyOutputSchema.parse({
    accountId: '0.0.12345',
    network: 'testnet',
    balance: 10000000n, // BigInt for precision
  });
  // result is now typed and validated
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Validation errors:', error.errors);
    // Handle validation errors
  }
}
```

### For Plugin Developers

#### Migrating to Zod Schemas (Recommended)

1. **Update imports**: Replace JSON schema imports with Zod schema imports
2. **Convert schemas**: Replace raw JSON schemas with Zod schemas
3. **Add type inference**: Use `z.infer<typeof Schema>` for TypeScript types
4. **Add runtime validation**: Use `.parse()` method for validation
5. **Update manifests**: Use `zodToJsonSchema()` for manifest compatibility
6. **Test validation**: Ensure schemas validate correctly with sample data

#### Legacy JSON Schema Support

1. Add `output` field to all command specifications in manifest
2. Define JSON schema for command outputs (or use Zod with conversion)
3. Provide human-readable templates (optional but recommended)
4. Update command handlers to return `CommandExecutionResult` (future)
5. Test schemas with sample outputs

#### Example Migration

**Before (JSON Schema)**:

```typescript
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  EntityIdSchema,
  NetworkSchema,
} from '../../core/schemas/common-schemas';

// Generate JSON schemas on-demand
const ENTITY_ID_JSON_SCHEMA = zodToJsonSchema(EntityIdSchema);
const NETWORK_JSON_SCHEMA = zodToJsonSchema(NetworkSchema);

const schema = {
  type: 'object',
  properties: {
    accountId: ENTITY_ID_JSON_SCHEMA,
    name: { type: 'string' },
    network: NETWORK_JSON_SCHEMA,
  },
  required: ['accountId', 'name', 'network'],
};
```

**After (Zod Schema)**:

```typescript
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { EntityIdSchema } from '../../core/schemas/common-schemas';

const MyOutputSchema = z.object({
  accountId: EntityIdSchema,
  name: z.string().describe('Account name'),
});

export type MyOutput = z.infer<typeof MyOutputSchema>;
export const MY_OUTPUT_SCHEMA = zodToJsonSchema(MyOutputSchema);
```

### For CLI Core

1. Implement `CommandExecutionResult` parsing
2. Add JSON Schema validation (with Zod support)
3. Implement template rendering (Handlebars)
4. Add format serializers (JSON, YAML, XML)
5. Add output redirection (`--output`)
6. Add script mode (`--script`)
7. Support both Zod and JSON Schema validation

## References

- [Architecture Decision Records](./adr/) - ADRs for interested developers
- [Zod Documentation](https://zod.dev/)
- [JSON Schema Documentation](https://json-schema.org/)
- [Handlebars Template Guide](https://handlebarsjs.com/guide/)
- [zod-to-json-schema](https://github.com/StefanTerdell/zod-to-json-schema)
