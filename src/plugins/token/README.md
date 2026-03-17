# Token Plugin

Complete token management plugin for the Hiero CLI following the plugin architecture.

## 🏗️ Architecture

This plugin follows the plugin architecture principles:

- **Stateless**: Plugin is functionally stateless
- **Dependency Injection**: Services are injected into command handlers
- **Manifest-Driven**: Capabilities declared via manifest with output specifications
- **Namespace Isolation**: Own state namespace (`token-tokens`)
- **Type Safety**: Full TypeScript support
- **Structured Output**: All command handlers return `CommandResult` with standardized output

## 📁 Structure

```
src/plugins/token/
├── manifest.ts              # Plugin manifest with command definitions and output specs
├── schema.ts                # Token data schema with Zod validation
├── commands/
│   ├── create-ft/
│   │   ├── handler.ts       # Fungible token creation handler
│   │   ├── input.ts         # Input schema
│   │   ├── output.ts        # Output schema and template
│   │   └── index.ts         # Command exports
│   ├── create-nft/
│   │   ├── handler.ts       # Non-fungible token creation handler
│   │   ├── input.ts         # Input schema
│   │   ├── output.ts        # Output schema and template
│   │   └── index.ts         # Command exports
│   ├── create-ft-from-file/
│   │   ├── handler.ts       # Fungible token from file handler
│   │   ├── input.ts         # Input schema
│   │   ├── output.ts        # Output schema and template
│   │   └── index.ts         # Command exports
│   ├── mint-ft/
│   │   ├── handler.ts       # Fungible token minting handler
│   │   ├── input.ts         # Input schema
│   │   ├── output.ts        # Output schema and template
│   │   └── index.ts         # Command exports
│   ├── mint-nft/
│   │   ├── handler.ts       # Non-fungible token minting handler
│   │   ├── input.ts         # Input schema
│   │   ├── output.ts        # Output schema and template
│   │   └── index.ts         # Command exports
│   ├── transfer-ft/
│   │   ├── handler.ts       # Fungible token transfer handler
│   │   ├── input.ts         # Input schema
│   │   ├── output.ts        # Output schema and template
│   │   └── index.ts         # Command exports
│   ├── transfer-nft/
│   │   ├── handler.ts       # NFT transfer handler
│   │   ├── input.ts         # Input validation schema
│   │   ├── output.ts        # Output schema and template
│   │   └── index.ts         # Command exports
│   ├── associate/
│   │   ├── handler.ts       # Token association handler
│   │   ├── input.ts         # Input schema
│   │   ├── output.ts        # Output schema and template
│   │   └── index.ts         # Command exports
│   ├── delete/
│   │   ├── handler.ts       # Token delete handler (local state only)
│   │   ├── input.ts         # Input schema
│   │   ├── output.ts        # Output schema and template
│   │   └── index.ts         # Command exports
│   ├── list/
│   │   ├── handler.ts       # Token list handler
│   │   ├── input.ts         # Input schema
│   │   ├── output.ts        # Output schema and template
│   │   └── index.ts         # Command exports
│   └── view/
│       ├── handler.ts       # Token view handler
│       ├── input.ts         # Input schema
│       ├── output.ts        # Output schema and template
│       └── index.ts         # Command exports
├── hooks/
│   ├── batch-create-ft/
│   │   ├── handler.ts       # TokenCreateFtBatchStateHook - persists FT state after batch execution
│   │   ├── types.ts         # CreateFtNormalisedParamsSchema for batch item validation
│   │   └── index.ts         # Hook exports
│   ├── batch-create-nft/
│   │   ├── handler.ts       # TokenCreateNftBatchStateHook - persists NFT state after batch execution
│   │   ├── types.ts         # CreateNftNormalisedParamsSchema for batch item validation
│   │   └── index.ts         # Hook exports
│   ├── batch-create-ft-from-file/
│   │   ├── handler.ts       # TokenCreateFtFromFileBatchStateHook - persists FT-from-file state after batch execution
│   │   ├── types.ts         # CreateFtFromFileNormalisedParamsSchema for batch item validation
│   │   └── index.ts         # Hook exports
│   ├── batch-create-nft-from-file/
│   │   ├── handler.ts       # TokenCreateNftFromFileBatchStateHook - persists NFT-from-file state after batch execution
│   │   ├── types.ts         # CreateNftFromFileNormalisedParamsSchema for batch item validation
│   │   └── index.ts         # Hook exports
│   └── batch-associate/
│       ├── handler.ts       # TokenAssociateBatchStateHook - persists association results after batch execution
│       ├── types.ts         # AssociateNormalisedParamsSchema for batch item validation
│       └── index.ts         # Hook exports
├── utils/
│   ├── nft-build-output.ts  # NFT output builder utilities
│   ├── token-amount-helpers.ts  # Token amount processing helpers
│   ├── token-data-builders.ts   # Token data builders for create-from-file
│   ├── token-associations.ts   # Token association processing
│   └── [other utility files...]
├── zustand-state-helper.ts  # State management helper
├── resolver-helper.ts       # Token and account resolver utilities
├── __tests__/               # Comprehensive test suite
│   ├── unit/
│   │   ├── adr007-compliance.test.ts  # Output structure compliance tests
│   │   ├── batch-create-ft.test.ts
│   │   ├── batch-create-nft.test.ts
│   │   ├── batch-create-ft-from-file.test.ts
│   │   ├── batch-create-nft-from-file.test.ts
│   │   └── [other test files...]
│   └── integration/
│       └── [integration test files...]
└── index.ts                # Plugin exports
```

## 🚀 Commands

All commands return `CommandResult` with structured output data in the `result` field. Errors are thrown as typed `CliError` instances and handled uniformly by the core framework.

Each command defines a Zod schema for output validation and a Handlebars template for human-readable formatting.

### Token Create (Fungible Token)

Create a new fungible token with specified properties.

```bash
# Using account alias
hcli token create-ft \
  --token-name "My Token" \
  --symbol "MTK" \
  --treasury alice \
  --decimals 2 \
  --initial-supply 1000 \
  --supply-type FINITE \
  --max-supply 10000 \
  --admin-key admin-public-key \
  --name mytoken-alias

# Using treasury-id:treasury-key pair
hcli token create-ft \
  --token-name "My Token" \
  --symbol "MTK" \
  --treasury 0.0.123456:302e020100300506032b657004220420... \
  --decimals 2 \
  --initial-supply 1000 \
  --supply-type INFINITE \
  --name mytoken-alias
```

**Batch support:** Pass `--batch <batch-name>` to add token creation to a batch instead of executing immediately. See the [Batch Support](#-batch-support) section.

### Token Mint FT

Mint additional fungible tokens to increase supply. Tokens are minted to the token's treasury account.

```bash
# Using token alias
hcli token mint-ft \
  --token mytoken-alias \
  --amount 1000 \
  --supply-key 0.0.123456:302e020100300506032b657004220420...

# Using token ID with account alias for supply key
hcli token mint-ft \
  --token 0.0.123456 \
  --amount 500t \
  --supply-key supply-account-alias

# Using base units (t suffix)
hcli token mint-ft \
  --token 0.0.123456 \
  --amount 5000t \
  --supply-key 0.0.123456:302e020100300506032b657004220420...
```

**Parameters:**

- `--token` / `-T`: Token identifier (alias or token ID) - **Required**
- `--amount` / `-a`: Amount to mint - **Required**
  - Display units (default): `100` (will be multiplied by token decimals)
  - Base units: `100t` (raw amount without decimals)
- `--supply-key` / `-s`: Supply key for signing - **Required**
  - Account alias: `supply-account-alias`
  - Account with key: `0.0.123456:private-key`
- `--key-manager` / `-k`: Key manager type (optional, defaults to config setting)
  - `local` or `local_encrypted`

**Note:** The token must have a supply key configured. Minted tokens are added to the token's treasury account.

### Token Mint NFT

Mint a new non-fungible token (NFT) to an NFT collection. Each mint operation creates a single NFT with unique metadata and serial number.

```bash
# Using token alias
hcli token mint-nft \
  --token my-nft-collection \
  --metadata "My NFT Metadata" \
  --supply-key 0.0.123456:302e020100300506032b657004220420...

# Using token ID with account alias for supply key
hcli token mint-nft \
  --token 0.0.123456 \
  --metadata "Unique NFT #1" \
  --supply-key supply-account-alias

# Using account-id:private-key pair for supply key
hcli token mint-nft \
  --token 0.0.123456 \
  --metadata "Test NFT" \
  --supply-key 0.0.123456:302e020100300506032b657004220420...
```

**Parameters:**

- `--token` / `-T`: Token identifier (alias or token ID) - **Required**
  - Must be an NFT collection (type: `NON_FUNGIBLE_TOKEN`)
- `--metadata` / `-m`: NFT metadata string - **Required**
  - Maximum size: 100 bytes
  - UTF-8 encoded string
- `--supply-key` / `-s`: Supply key for signing - **Required**
  - Account alias: `supply-account-alias`
  - Account with key: `0.0.123456:private-key`
- `--key-manager` / `-k`: Key manager type (optional, defaults to config setting)
  - `local` or `local_encrypted`

**Output:**

The command returns the minted NFT's serial number, which uniquely identifies the NFT within the collection:

```json
{
  "transactionId": "0.0.123@1700000000.123456789",
  "tokenId": "0.0.123456",
  "serialNumber": "1",
  "network": "testnet"
}
```

**Notes:**

- The token must be an NFT collection (created with `create-nft` command)
- The token must have a supply key configured
- The provided supply key must match the token's supply key
- Metadata cannot exceed 100 bytes (Hedera limit)
- For tokens with finite supply, the command validates that minting won't exceed `maxSupply`
- Minted NFT is assigned to the token's treasury account
- Each mint operation creates exactly one NFT with a unique serial number

**Example Workflow:**

```bash
# 1. Create NFT collection
hcli token create-nft \
  --token-name "My Collection" \
  --symbol "MC" \
  --treasury alice \
  --supply-type FINITE \
  --max-supply 100 \
  --admin-key alice \
  --supply-key alice \
  --name my-collection

# 2. Mint NFT to collection
hcli token mint-nft \
  --token my-collection \
  --metadata "First NFT in collection" \
  --supply-key alice

# 3. View minted NFT
hcli token view --token my-collection --serial 1
```

### Token Associate

Associate a fungible or non-fungible token with an account to enable transfers. Use `token associate` for both FT and NFT tokens.

```bash
# Using account alias
hcli token associate \
  --token mytoken-alias \
  --account alice

# Using account-id:account-key pair
hcli token associate \
  --token 0.0.123456 \
  --account 0.0.789012:302e020100300506032b657004220420...

# Add to batch
hcli token associate --token mytoken-alias --account alice --batch my-batch
```

### Token Transfer (Fungible Token)

Transfer a fungible token from one account to another.

```bash
# Using account name for source
hcli token transfer-ft \
  --token mytoken-alias \
  --from alice \
  --to bob \
  --amount 100

# Using account-id:private-key pair for source
hcli token transfer-ft \
  --token 0.0.123456 \
  --from 0.0.111111:302e020100300506032b657004220420... \
  --to 0.0.222222 \
  --amount 100t
```

### Token Transfer NFT

Transfer one or more NFTs from one account to another.

```bash
# Using account alias for source
hcli token transfer-nft \
  --token mynft-alias \
  --from alice \
  --to bob \
  --serials 1,2,3

# Using account-id:private-key pair for source
hcli token transfer-nft \
  --token 0.0.123456 \
  --from 0.0.111111:302e020100300506032b657004220420... \
  --to 0.0.222222 \
  --serials 5

# Omitting --from uses operator account
hcli token transfer-nft \
  --token mynft-alias \
  --to bob \
  --serials 1,2,3
```

**Parameters:**

- `--token` / `-T`: NFT token identifier (alias or token ID) - **Required**
- `--to` / `-t`: Destination account (alias, account-id, or EVM address) - **Required**
- `--from` / `-f`: Source account (alias or account-id:private-key pair) - **Optional** (defaults to operator)
- `--serials` / `-s`: NFT serial numbers to transfer (comma-separated, max 10) - **Required**
- `--key-manager` / `-k`: Key manager type (optional, defaults to config setting)
  - `local` or `local_encrypted`

**Note:** Maximum 10 serial numbers per transaction (Hedera limit). The command verifies NFT ownership before transfer.

### Token Delete

Delete a token from local state. This only removes the token from the local address book, not from the Hedera network.

```bash
# Delete by token alias
hcli token delete --token mytoken-alias

# Delete by token ID
hcli token delete --token 0.0.123456
```

**Parameters:**

- `--token` / `-T`: Token identifier: either a token alias or token-id - **Required**

Any aliases associated with the token on the current network will also be removed.

### Token List

List all tokens (FT and NFT) stored in state for all networks.

```bash
hcli token list
hcli token list --keys  # Show token key information
```

### Token View

View detailed information about fungible or non-fungible tokens from the Hedera Mirror Node.

```bash
# View token by alias
hcli token view --token mytoken-alias

# View token by ID
hcli token view --token 0.0.123456

# View specific NFT serial
hcli token view --token mytoken-alias --serial 1
```

### Token Create From File (Fungible Token)

Create a new fungible token from a JSON file definition with advanced features.

```bash
# Basic usage
hcli token create-ft-from-file --file token-definition.json

# With specific key manager
hcli token create-ft-from-file --file token-definition.json --key-manager local_encrypted

# Add to batch
hcli token create-ft-from-file --file token-definition.json --batch my-batch
```

**Token File Format:**

`initialSupply` and `maxSupply` must be strings. Supported formats (same as other token commands):

- Display units: `"100"` or `"100.5"` (multiplied by decimals)
- Base units: `"100t"` (raw amount, no decimals applied)

The token file supports aliases and raw keys with optional key type prefixes:

```json
{
  "name": "my-token",
  "symbol": "MTK",
  "decimals": 8,
  "supplyType": "finite",
  "initialSupply": "1000000",
  "maxSupply": "10000000",
  "treasuryKey": "<alias or accountId:privateKey>",
  "adminKey": "<alias or accountId:privateKey>",
  "supplyKey": "<alias or accountId:privateKey>",
  "wipeKey": "<alias or accountId:privateKey>",
  "kycKey": "<alias or accountId:privateKey>",
  "freezeKey": "<alias or accountId:privateKey>",
  "pauseKey": "<alias or accountId:privateKey>",
  "feeScheduleKey": "<alias or accountId:privateKey>",
  "memo": "Optional token memo",
  "associations": ["<alias or accountId:privateKey>", "..."],
  "customFees": [
    {
      "type": "fixed",
      "amount": 100,
      "unitType": "HBAR",
      "collectorId": "<accountId>",
      "exempt": false
    }
  ]
}
```

**Supported formats for treasury and keys:**

- **Alias**: `"my-account"` - resolved via alias service
- **Account with key**: `"0.0.123456:privateKey"`

**Note**: Token name is automatically registered as an alias after successful creation. Duplicate names are not allowed.

### Token Create From File (Non-Fungible Token)

Create a new non-fungible token from a JSON file definition with advanced features.

```bash
# Basic usage
hcli token create-nft-from-file --file nft-definition.json

# With specific key manager
hcli token create-nft-from-file --file nft-definition.json --key-manager local_encrypted

# Add to batch
hcli token create-nft-from-file --file nft-definition.json --batch my-batch
```

**Token File Format:**

The NFT file supports aliases and raw keys with optional key type prefixes:

```json
{
  "name": "my-nft",
  "symbol": "MNFT",
  "supplyType": "finite",
  "maxSupply": 1000,
  "treasuryKey": "<alias or accountId:privateKey>",
  "adminKey": "<alias or accountId:privateKey>",
  "supplyKey": "<alias or accountId:privateKey>",
  "wipeKey": "<alias or accountId:privateKey>",
  "kycKey": "<alias or accountId:privateKey>",
  "freezeKey": "<alias or accountId:privateKey>",
  "pauseKey": "<alias or accountId:privateKey>",
  "feeScheduleKey": "<alias or accountId:privateKey>",
  "memo": "Optional NFT collection memo",
  "associations": ["<alias or accountId:privateKey>", "..."]
}
```

**Supported formats for treasury and keys:**

- **Alias**: `"my-account"` - resolved via alias service
- **Account with key**: `"0.0.123456:privateKey"`

**Key Differences from Fungible Token:**

- No `decimals` or `initialSupply` fields (NFT-specific)
- `maxSupply` represents the maximum number of NFT instances in the collection
- NFTs are minted individually with metadata via `mint-nft` command
- No `customFees` field (planned for future versions)

**Note**: NFT token name is automatically registered as an alias after successful creation. Duplicate names are not allowed. Token associations are created automatically for all specified accounts.

## 📝 Parameter Formats

The plugin supports flexible parameter formats:

- **Token**: Token alias (name) or token ID (`0.0.123456`)
- **Treasury**: Account alias (name) or `treasury-id:treasury-key` pair (e.g., `0.0.123456:302e0201...`)
- **Account ID only**: `0.0.123456` (for destination accounts)
- **Account ID with key**: `0.0.123456:private-key` (for source accounts that need signing)
- **Account name**: `alice` (resolved via alias service)
- **Amount**: Display units (default) or base units with `t` suffix (e.g., `100t`)

### Private Key Format

Private keys can optionally be prefixed with their key type:

- **With prefix**: `ed25519:12345676543212345` or `ecdsa:12345676543212345`
- **Without prefix**: `12345676543212345` (defaults to `ecdsa`)

This applies to:

- Treasury keys in `create-from-file` command
- Association keys in `create-from-file` command
- Account keys in `treasury-id:key` format

## 📦 Batch Support

The following token commands support the `--batch` / `-B` flag via the batch plugin's `batchify` hook:

- `create-ft` – `TokenCreateFtBatchStateHook` persists FT state after batch execution
- `create-nft` – `TokenCreateNftBatchStateHook` persists NFT state after batch execution
- `create-ft-from-file` – `TokenCreateFtFromFileBatchStateHook` persists FT-from-file state
- `create-nft-from-file` – `TokenCreateNftFromFileBatchStateHook` persists NFT-from-file state
- `associate` – `TokenAssociateBatchStateHook` persists association results
- `mint-ft`, `mint-nft`, `transfer-ft`, `transfer-nft` – can be batched (no state hook; transactions execute atomically)

When you pass `--batch <batch-name>`:

1. **No immediate execution** – The transaction is not submitted to the network. Instead, it is serialized and added to the specified batch.
2. **Deferred execution** – Run `hcli batch execute --name <batch-name>` to submit all batched transactions atomically.
3. **State persistence** – After successful batch execution, the corresponding batch-state hooks run for create/associate commands to persist token data, associations, and aliases.

**Example workflow:**

```bash
# 1. Create a batch
hcli batch create --name my-batch --key operator-alias

# 2. Add token operations to the batch
hcli token create-ft --token-name "Token A" --symbol "TA" --treasury alice --decimals 8 --initial-supply 1000 --supply-type FINITE --max-supply 10000 --admin-key alice --supply-key alice --name token-a --batch my-batch
hcli token create-ft-from-file --file token-definition.json --batch my-batch
hcli token associate --token token-a --account bob --batch my-batch

# 3. Execute the batch
hcli batch execute --name my-batch
```

The `--batch` option is automatically injected by the batchify hook. See the [Batch Plugin README](../batch/README.md) for full batch documentation.

## 🔧 Core API Integration

The plugin uses the Core API services:

- `api.token` - Token transaction creation and management
- `api.txExecution` - Transaction signing and execution
- `api.kms` - Account credentials and key management
- `api.alias` - Account and token name resolution
- `api.state` - Namespaced state management
- `api.network` - Network information
- `api.receipt` - Transaction receipt retrieval (used by batch-state hooks)
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

## 📊 State Management

Token data is stored in the `token-tokens` namespace with the following structure:

```typescript
interface TokenData {
  tokenId: string;
  name: string;
  symbol: string;
  treasuryId: string;
  tokenType: 'FUNGIBLE_COMMON' | 'NON_FUNGIBLE_UNIQUE';
  decimals: number;
  initialSupply: number;
  supplyType: SupplyType;
  maxSupply: number;
  memo?: string;
  keys: TokenKeys;
  network: 'mainnet' | 'testnet' | 'previewnet' | 'localnet';
  associations: TokenAssociation[];
  customFees: CustomFee[];
}
```

The `tokenType` field discriminates fungible tokens (`FUNGIBLE_COMMON`) from NFT collections (`NON_FUNGIBLE_UNIQUE`). NFT tokens use zero for `decimals` and `initialSupply`; minted NFTs are tracked by serial number on the ledger. The schema is validated using Zod (`TokenDataSchema`) and stored as JSON Schema in the plugin manifest for runtime validation.

## 🧪 Testing

The plugin includes comprehensive tests for output structure:

```typescript
import { Status } from '../../../core/shared/constants';

// Example test verifying CommandResult structure
describe('Token Plugin Output Structure', () => {
  test('fungible token create command returns CommandResult', async () => {
    const result = await createToken(mockArgs);

    // Assert structure
    expect(result.result).toBeDefined();

    // Assert output format
    const output = result.result as CreateFungibleTokenOutput;
    expect(output.tokenId).toBe('0.0.12345');
    expect(output.name).toBe('TestToken');
  });
});
```

### Test Structure

- **Output Compliance**: `adr007-compliance.test.ts` - Tests all handlers return proper `CommandResult`
- **Unit Tests**: Individual command handler tests with mocks and fixtures
- **Batch Tests**: `batch-create-ft.test.ts`, `batch-create-nft.test.ts`, `batch-create-ft-from-file.test.ts`, `batch-create-nft-from-file.test.ts` - Tests batch-state hooks
- **Integration Tests**: End-to-end token lifecycle tests
- **Schema Tests**: Validation of input/output schemas

## 📊 Output Formats

All commands support multiple output formats:

### Human-Readable (Default)

**Token Create:**

```
✅ Token created successfully: 0.0.12345
   Name: MyToken (MTK)
   Treasury: 0.0.111
   Decimals: 2
   Initial Supply: 1000000
   Supply Type: INFINITE
   Network: testnet
   Transaction ID: 0.0.123@1700000000.123456789
```

**FT Mint:**

```
✅ FT mint successful!
   Token ID: 0.0.123456
   Amount minted: 10000
   Transaction ID: 0.0.123@1700000000.123456789
```

**NFT Mint:**

```
✅ NFT mint successful!
   Token ID: 0.0.123456
   Serial Number: 1
   Transaction ID: 0.0.123@1700000000.123456789
```

### JSON Output

**Fungible Token Create:**

```json
{
  "tokenId": "0.0.12345",
  "name": "MyToken",
  "symbol": "MTK",
  "treasuryId": "0.0.111",
  "decimals": 2,
  "initialSupply": "1000000",
  "supplyType": "INFINITE",
  "transactionId": "0.0.123@1700000000.123456789",
  "network": "testnet"
}
```

**FT Mint:**

```json
{
  "transactionId": "0.0.123@1700000000.123456789",
  "tokenId": "0.0.123456",
  "amount": "10000",
  "network": "testnet"
}
```

**NFT Mint:**

```json
{
  "transactionId": "0.0.123@1700000000.123456789",
  "tokenId": "0.0.123456",
  "serialNumber": "1",
  "network": "testnet"
}
```

Output format is controlled by the CLI's `--format` option (default: `human`, or `json` for machine-readable output).
