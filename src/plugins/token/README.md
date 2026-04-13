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
│   ├── burn-ft/
│   │   ├── handler.ts       # Fungible token burn handler
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
│   ├── airdrop-ft/
│   │   ├── handler.ts       # Fungible token airdrop handler (multi-recipient)
│   │   ├── input.ts         # Input schema with REPEATABLE --to/--amount
│   │   ├── output.ts        # Output schema and template
│   │   ├── types.ts         # Command-specific type definitions
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
│   ├── airdrop-nft/
│   │   ├── handler.ts       # NFT airdrop handler (multi-recipient)
│   │   ├── input.ts         # Input schema with REPEATABLE --to/--serials
│   │   ├── output.ts        # Output schema and template
│   │   ├── types.ts         # Command-specific type definitions
│   │   └── index.ts         # Command exports
│   ├── cancel-airdrop/
│   │   ├── handler.ts       # Cancel pending airdrop handler (FT and NFT)
│   │   ├── input.ts         # Input schema
│   │   ├── output.ts        # Output schema and template
│   │   ├── types.ts         # Command-specific type definitions
│   │   └── index.ts         # Command exports
│   ├── associate/
│   │   ├── handler.ts       # Token association handler
│   │   ├── input.ts         # Input schema
│   │   ├── output.ts        # Output schema and template
│   │   └── index.ts         # Command exports
│   ├── allowance-ft/
│   │   ├── handler.ts       # Fungible token allowance handler
│   │   ├── input.ts         # Input schema
│   │   ├── output.ts        # Output schema and template
│   │   ├── types.ts         # Internal types
│   │   └── index.ts         # Command exports
│   ├── delete/
│   │   ├── handler.ts       # Token delete handler (network or local state)
│   │   ├── input.ts         # Input schema
│   │   ├── output.ts        # Output schema and template
│   │   └── index.ts         # Command exports
│   ├── allowance-nft/
│   │   ├── handler.ts       # NFT allowance approval handler
│   │   ├── input.ts         # Input schema
│   │   ├── output.ts        # Output schema and template
│   │   ├── types.ts         # Command-specific type definitions
│   │   └── index.ts         # Command exports
│   ├── delete-allowance-nft/
│   │   ├── handler.ts       # NFT allowance deletion handler
│   │   ├── input.ts         # Input schema
│   │   ├── output.ts        # Output schema and template
│   │   ├── types.ts         # Command-specific type definitions
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
│   ├── token-build-output.ts  # NFT output builder utilities
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

**Auto-renew and expiration** (optional):

- `--auto-renew-period` / `-R`: Auto-renew interval. A plain integer is **seconds** (e.g. `500`). You may use a suffix: `s` (seconds), `m` (minutes), `h` (hours), `d` (days), e.g. `500s`, `50m`, `2h`, `1d`. **Requires** `--auto-renew-account`; if the period is set without an account, validation fails.
- `--auto-renew-account` / `-r`: Account that pays for auto-renewal (same accepted formats as `--treasury`: alias, `accountId:privateKey`, key reference, etc.).
- `--expiration-time` / `-x`: Fixed expiration as an **ISO 8601** datetime (e.g. `2030-12-31T23:59:59.000Z`). If both **auto-renew period and account** are set, **expiration is ignored** and a warning is logged (auto-renew takes precedence).

Command output includes optional `autoRenewPeriodSeconds`, `autoRenewAccountId`, and `expirationTime` (ISO string when a fixed expiration was applied).

```bash
# Auto-renew every 30 days, paid by a dedicated account
hcli token create-ft \
  --token-name "My Token" \
  --symbol "MTK" \
  --auto-renew-period 30d \
  --auto-renew-account 0.0.789012:302e020100300506032b657004220420...
```

**Batch support:** Pass `--batch <batch-name>` to add token creation to a batch instead of executing immediately. See the [Batch Support](#-batch-support) section.

### Token Create NFT

Create a new non-fungible token (NFT) collection with specified properties.

```bash
# Using account alias
hcli token create-nft \
  --token-name "My NFT Collection" \
  --symbol "MNFT" \
  --treasury alice \
  --supply-type FINITE \
  --max-supply 1000 \
  --admin-key alice \
  --supply-key alice \
  --freeze-key alice \
  --wipe-key alice \
  --name my-nft-collection

# With additional optional keys and settings
hcli token create-nft \
  --token-name "My Collection" \
  --symbol "MC" \
  --treasury 0.0.123456:302e020100300506032b657004220420... \
  --supply-type INFINITE \
  --admin-key alice \
  --supply-key alice \
  --kyc-key alice \
  --pause-key alice \
  --fee-schedule-key alice \
  --metadata-key alice \
  --auto-renew-period 7776000 \
  --auto-renew-account-id 0.0.123456 \
  --freeze-default false \
  --name my-collection
```

**Parameters:**

- `--token-name` / `-T`: Token name - **Required**
- `--symbol` / `-s`: Token symbol/ticker - **Required**
- `--treasury`: Treasury account for the NFT collection - **Optional** (defaults to operator)
  - Account alias: `alice`
  - Account with key: `0.0.123456:private-key`
- `--supply-type`: Supply type - **Optional** (defaults to `INFINITE`)
  - `INFINITE` - Unlimited supply
  - `FINITE` - Fixed maximum supply (requires `--max-supply`)
- `--max-supply`: Maximum number of NFTs in collection (required for FINITE) - **Optional**
- `--admin-key`: Admin key for administrative operations - **Optional**
- `--supply-key`: Supply key for minting NFTs - **Optional**
- `--freeze-key`: Freeze key to freeze token transfers for accounts - **Optional**
- `--wipe-key`: Wipe key to wipe token balances - **Optional**
- `--kyc-key`: KYC key to grant/revoke KYC status - **Optional**
- `--pause-key`: Pause key to pause all token transfers - **Optional**
- `--fee-schedule-key`: Fee schedule key to modify custom fees - **Optional**
- `--metadata-key`: Metadata key to update token metadata - **Optional**
- `--freeze-default`: Default freeze status for new associations (requires `--freeze-key`) - **Optional** (defaults to false)
- `--auto-renew-period`: Token auto-renewal period in seconds (e.g., 7776000 for 90 days) - **Optional**
- `--auto-renew-account-id`: Account ID that pays for token auto-renewal fees - **Optional**
- `--expiration-time`: Token expiration time in ISO 8601 format (e.g., 2027-01-01T00:00:00Z) - **Optional**
- `--name`: Token alias to register - **Optional**
- `--key-manager`: Key manager type - **Optional** (defaults to config setting)
  - `local` or `local_encrypted`
- `--memo`: Optional memo for the token (max 100 characters) - **Optional**
- `--batch`: Add to batch instead of executing immediately - **Optional**

**Output:**

```json
{
  "tokenId": "0.0.123456",
  "name": "My NFT Collection",
  "symbol": "MNFT",
  "treasuryId": "0.0.111",
  "supplyType": "FINITE",
  "transactionId": "0.0.123@1700000000.123456789",
  "adminPublicKey": "302e020100300506032b657004220420...",
  "supplyPublicKey": "302e020100300506032b657004220420...",
  "freezePublicKey": "302e020100300506032b657004220420...",
  "wipePublicKey": "302e020100300506032b657004220420...",
  "kycPublicKey": "302e020100300506032b657004220420...",
  "pausePublicKey": "302e020100300506032b657004220420...",
  "feeSchedulePublicKey": "302e020100300506032b657004220420...",
  "metadataPublicKey": "302e020100300506032b657004220420...",
  "network": "testnet"
}
```

**Notes:**

- NFTs are non-fungible, meaning each NFT is unique and tracked by serial number
- No decimals field applies to NFTs
- Use `mint-nft` command to mint individual NFTs to the collection
- Token name is automatically registered as an alias after successful creation
- Freeze default requires freeze key to be set

**Batch support:** Pass `--batch <batch-name>` to add NFT collection creation to a batch instead of executing immediately. See the [Batch Support](#-batch-support) section.

### Token Burn FT

Burn fungible tokens from the token's Treasury account to decrease total supply. Requires the supply key.

```bash
# Using token alias
hcli token burn-ft \
  --token mytoken-alias \
  --amount 1000 \
  --supply-key 0.0.123456:302e020100300506032b657004220420...

# Using token ID with base units (t suffix)
hcli token burn-ft \
  --token 0.0.123456 \
  --amount 5000t \
  --supply-key 0.0.123456:302e020100300506032b657004220420...

# Using an account alias for supply key
hcli token burn-ft \
  --token 0.0.123456 \
  --amount 500 \
  --supply-key supply-account-alias
```

**Parameters:**

- `--token` / `-T`: Token identifier (alias or token ID) - **Required**
- `--amount` / `-a`: Amount to burn - **Required**
  - Display units (default): `100` (will be multiplied by token decimals)
  - Base units: `100t` (raw amount without decimals)
- `--supply-key` / `-s`: Supply key for signing - **Required**
  - Account alias: `supply-account-alias`
  - Account with key: `0.0.123456:private-key`
- `--key-manager` / `-k`: Key manager type (optional, defaults to config setting)
  - `local` or `local_encrypted`

**Note:** The burn amount cannot exceed the token's current total supply. Tokens can only be burned from the treasury account.

**Batch support:** Pass `--batch <batch-name>` to add to a batch. See the [Batch Support](#-batch-support) section.

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
- `--supply-key` / `-s`: Supply key credential(s) for signing - **Optional if** every required on-chain supply public key already has matching material in the key manager (otherwise pass explicit credential(s))
  - **Repeatable:** pass `--supply-key` multiple times when the token’s on-chain supply key is a KeyList or threshold key and you need more than one distinct signer
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
- `--supply-key` / `-s`: Supply key credential(s) for signing - **Optional if** every required on-chain supply public key already has matching material in the key manager (otherwise pass explicit credential(s))
  - **Repeatable:** pass `--supply-key` multiple times when the token’s on-chain supply key is a KeyList or threshold key and you need more than one distinct signer
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
- When using `--supply-key`, provide enough credentials to satisfy the on-chain supply key policy (including M-of-N threshold keys)
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

### Token Allowance NFT

Approve a spender to transfer NFTs on behalf of the owner. This command creates an AccountAllowanceApproveTransaction that grants permission to a spender account to transfer specific or all NFT serials from the owner's account.

```bash
# Approve specific serial numbers
hcli token allowance-nft \
  --token mynft-alias \
  --spender bob \
  --owner alice \
  --serials 1,2,3

# Approve all serials in the collection
hcli token allowance-nft \
  --token mynft-alias \
  --spender bob \
  --owner alice \
  --all-serials

# Owner defaults to operator
hcli token allowance-nft \
  --token mynft-alias \
  --spender 0.0.222222 \
  --serials 1,5,10

# Using account-id:private-key pair for owner
hcli token allowance-nft \
  --token 0.0.123456 \
  --spender bob \
  --owner 0.0.111111:302e020100300506032b657004220420... \
  --all-serials
```

**Parameters:**

- `--token` / `-T`: NFT token identifier (alias or token ID) - **Required**
  - Must be an NFT collection (type: `NON_FUNGIBLE_UNIQUE`)
- `--spender` / `-s`: Spender account (ID, EVM address, or alias) - **Required**
  - Account that will be granted permission to transfer NFTs
- `--owner` / `-o`: Owner account - **Optional** (defaults to operator)
  - Accepts any key format
  - Account ID only: `0.0.111111`
  - Account with key: `0.0.111111:private-key`
  - Account alias: `alice`
- `--serials`: Specific NFT serial numbers to approve (comma-separated, e.g., `1,2,3`) - **Optional**
  - Mutually exclusive with `--all-serials`
- `--all-serials`: Approve all serials in the collection - **Optional**
  - Mutually exclusive with `--serials`
  - One of `--serials` or `--all-serials` must be specified
- `--key-manager` / `-k`: Key manager type (optional, defaults to config setting)
  - `local` or `local_encrypted`

**Output:**

The command returns the transaction details and approval confirmation:

```json
{
  "transactionId": "0.0.123@1700000000.123456789",
  "tokenId": "0.0.123456",
  "ownerAccountId": "0.0.111111",
  "spenderAccountId": "0.0.222222",
  "serials": [1, 2, 3],
  "allSerials": false,
  "network": "testnet"
}
```

When using `--all-serials`:

```json
{
  "transactionId": "0.0.123@1700000000.123456789",
  "tokenId": "0.0.123456",
  "ownerAccountId": "0.0.111111",
  "spenderAccountId": "0.0.222222",
  "serials": null,
  "allSerials": true,
  "network": "testnet"
}
```

### Delete Token Allowance NFT

Delete NFT allowances. Supports two modes:

1. **Specific serials** (`--serials`): Uses `AccountAllowanceDeleteTransaction` to remove allowance for specific serial numbers from ALL spenders. No `--spender` needed.
2. **All-serials blanket revoke** (`--all-serials`): Uses `AccountAllowanceApproveTransaction.deleteTokenNftAllowanceAllSerials` to revoke a blanket all-serials approval for a specific spender. Requires `--spender`.

```bash
# Delete allowance for specific serials (removes for ALL spenders)
hcli token delete-allowance-nft \
  --token mynft-alias \
  --owner alice \
  --serials 1,2,3

# Revoke all-serials blanket approval for a specific spender
hcli token delete-allowance-nft \
  --token mynft-alias \
  --owner alice \
  --spender bob \
  --all-serials

# Owner defaults to operator
hcli token delete-allowance-nft \
  --token mynft-alias \
  --serials 1,5,10

# Using account-id:private-key pair for owner
hcli token delete-allowance-nft \
  --token 0.0.123456 \
  --owner 0.0.111111:302e020100300506032b657004220420... \
  --serials 1,2,3
```

**Parameters:**

- `--token` / `-T`: NFT token identifier (alias or token ID) - **Required**
  - Must be an NFT collection (type: `NON_FUNGIBLE_UNIQUE`)
- `--owner` / `-o`: Owner account - **Optional** (defaults to operator)
  - Accepts any key format
  - Account ID only: `0.0.111111`
  - Account with key: `0.0.111111:private-key`
  - Account alias: `alice`
- `--serials`: Specific NFT serial numbers to delete allowance for (comma-separated, e.g., `1,2,3`) - **Optional**
  - Removes allowance for ALL spenders on these serials
  - Mutually exclusive with `--all-serials`
  - Cannot be used with `--spender`
- `--all-serials`: Revoke all-serials blanket approval - **Optional**
  - Mutually exclusive with `--serials`
  - Requires `--spender`
  - One of `--serials` or `--all-serials` must be specified
- `--spender` / `-s`: Spender account (ID, EVM address, or alias) - **Conditional**
  - Required with `--all-serials`, not used with `--serials`
- `--key-manager` / `-k`: Key manager type (optional, defaults to config setting)
  - `local` or `local_encrypted`

**Output** (specific serials):

```json
{
  "transactionId": "0.0.123@1700000000.123456789",
  "tokenId": "0.0.123456",
  "ownerAccountId": "0.0.111111",
  "spenderAccountId": null,
  "serials": [1, 2, 3],
  "allSerials": false,
  "network": "testnet"
}
```

When using `--all-serials`:

```json
{
  "transactionId": "0.0.123@1700000000.123456789",
  "tokenId": "0.0.123456",
  "ownerAccountId": "0.0.111111",
  "spenderAccountId": "0.0.222222",
  "serials": null,
  "allSerials": true,
  "network": "testnet"
}
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

### Token Airdrop (Fungible Token)

Airdrop fungible tokens from one account to one or more recipients in a single transaction. If a recipient lacks auto-association slots or has "receiver signature required" set, the transfer becomes a **pending airdrop** (not a failure) that the recipient must claim separately.

```bash
# Airdrop to a single recipient
hcli token airdrop-ft \
  --token mytoken-alias \
  --to alice \
  --amount 100

# Airdrop to multiple recipients (index-mapped: to[0]↔amount[0])
hcli token airdrop-ft \
  --token 0.0.123456 \
  --to 0.0.100001 --amount 100 \
  --to 0.0.100002 --amount 200 \
  --to 0.0.100003 --amount 50

# Using raw base units with "t" suffix
hcli token airdrop-ft \
  --token mytoken-alias \
  --to alice --amount 1000t \
  --to bob --amount 500t \
  --from 0.0.111111:302e020100300506032b657004220420...

# Add to a batch
hcli token airdrop-ft \
  --token mytoken-alias \
  --to alice --amount 100 \
  --batch my-airdrop-batch
```

**Parameters:**

- `--token` / `-T`: Fungible token identifier (alias or token ID) - **Required**
- `--to` / `-t`: Recipient account (alias, account-id, or EVM address) — pass multiple times for multiple recipients - **Required**
- `--amount` / `-a`: Amount to airdrop — index-mapped to `--to`. Default: display units (decimals applied). Append `t` for raw base units — pass multiple times to match `--to` - **Required**
- `--from` / `-f`: Sender account (alias or account-id:private-key pair) - **Optional** (defaults to operator)
- `--key-manager` / `-k`: Key manager type - **Optional** (defaults to config setting)
  - `local` or `local_encrypted`

**Notes:**

- The number of `--to` flags must equal the number of `--amount` flags (validated at input)
- Maximum 9 recipients per transaction (Hedera limit: 10 balance adjustments including sender debit)
- Batch support: pass `--batch <batch-name>` to queue the transaction for batch execution

**Implementation:** [`src/plugins/token/commands/airdrop-ft/handler.ts`](./commands/airdrop-ft/handler.ts)

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

### Token Airdrop (Non-Fungible Token)

Airdrop specific NFT serial numbers from one account to one or more recipients in a single transaction. If a recipient lacks auto-association slots, the transfer becomes a **pending airdrop** (not a failure) that the recipient must claim separately.

```bash
# Airdrop a single serial to one recipient
hcli token airdrop-nft \
  --token mynft-alias \
  --to alice \
  --serials 1

# Airdrop multiple serials to one recipient
hcli token airdrop-nft \
  --token mynft-alias \
  --to alice \
  --serials 1,2,3

# Airdrop to multiple recipients (index-mapped: to[0]↔serials[0])
hcli token airdrop-nft \
  --token 0.0.123456 \
  --to 0.0.100001 --serials 1,2 \
  --to 0.0.100002 --serials 3,4 \
  --from 0.0.111111:302e020100300506032b657004220420...

# Add to a batch
hcli token airdrop-nft \
  --token mynft-alias \
  --to alice --serials 1 \
  --to bob --serials 2 \
  --batch my-airdrop-batch
```

**Parameters:**

- `--token` / `-T`: NFT token identifier (alias or token ID) - **Required**
- `--to` / `-t`: Recipient account(s) (ID, EVM address, or alias) — pass multiple times for multiple recipients - **Required**
- `--serials` / `-s`: Serial numbers per recipient (comma-separated). Index-mapped to `--to` — pass multiple times to match `--to` - **Required**
- `--from` / `-f`: Sender account (alias or account-id:private-key pair) - **Optional** (defaults to operator)
- `--key-manager` / `-k`: Key manager type - **Optional** (defaults to config setting)
  - `local` or `local_encrypted`

**Notes:**

- The number of `--to` flags must equal the number of `--serials` flags (validated at input)
- Serial numbers must be unique across all recipients (no duplicates allowed)
- Maximum 20 NFT serial transfers per transaction (Hedera limit)
- Batch support: pass `--batch <batch-name>` to queue the transaction for batch execution

**Implementation:** [`src/plugins/token/commands/airdrop-nft/handler.ts`](./commands/airdrop-nft/handler.ts)

### Claim Airdrop

Claim one or more pending airdrops (FT and/or NFT) for a receiver account. Up to 10 airdrops can be claimed in a single transaction.

Use `pending-airdrops` first to list pending airdrops and their indices.

```bash
# List pending airdrops to see indices
hcli token pending-airdrops --account myaccount
# Output:
#   1. MyToken (MTK) [0.0.123] — Amount: 1000
#   2. CoolNFT (CNFT) [0.0.456] — Serial: #5

# Claim a single airdrop by index
hcli token claim-airdrop --account myaccount --index 1

# Claim multiple airdrops (FT and NFT in one transaction)
hcli token claim-airdrop --account myaccount --index 1 --index 2

# Using explicit signing account
hcli token claim-airdrop --account myaccount --index 1 --from my-key

# Batch mode
hcli token claim-airdrop --account myaccount --index 1 --batch my-batch
```

**Options:**

- `--account` (required): Receiver account ID or alias
- `--index` (required, repeatable): 1-based index from `pending-airdrops` output
- `--from` (optional): Signing account. Defaults to operator
- `--key-manager` (optional): Key manager type (`local` or `local_encrypted`)

**Notes:**

- Maximum 10 airdrops per transaction (Hedera SDK limit)
- Both FT and NFT airdrops can be claimed in a single transaction
- Indices are 1-based and correspond to the order shown by `pending-airdrops`
- Batch support: pass `--batch <batch-name>` to queue the transaction for batch execution

**Implementation:** [`src/plugins/token/commands/claim-airdrop/handler.ts`](./commands/claim-airdrop/handler.ts)

### Cancel Token Airdrop

Cancel a pending token airdrop (FT or NFT). The sender of the original airdrop must sign this transaction.

```bash
# Cancel a pending FT airdrop
hcli token cancel-airdrop \
  --token 0.0.123456 \
  --receiver 0.0.200000

# Cancel a pending NFT airdrop (requires --serial)
hcli token cancel-airdrop \
  --token 0.0.123456 \
  --receiver 0.0.200000 \
  --serial 42

# Specify sender key explicitly (defaults to operator)
hcli token cancel-airdrop \
  --token mytoken-alias \
  --receiver alice \
  --from 0.0.111111:302e020100300506032b657004220420...

# Add to a batch
hcli token cancel-airdrop \
  --token 0.0.123456 \
  --receiver 0.0.200000 \
  --batch my-batch

# Schedule the transaction
hcli token cancel-airdrop \
  --token 0.0.123456 \
  --receiver 0.0.200000 \
  --schedule my-schedule
```

**Options:**

| Option          | Short | Required | Description                                              |
| --------------- | ----- | -------- | -------------------------------------------------------- |
| `--token`       | `-T`  | Yes      | Token identifier (ID or alias)                           |
| `--receiver`    | `-r`  | Yes      | Receiver account (ID, EVM address, or alias)             |
| `--serial`      | `-s`  | No       | NFT serial number. If provided, cancels an NFT airdrop   |
| `--from`        | `-f`  | No       | Sender key. Accepts any key format. Defaults to operator |
| `--key-manager` | `-k`  | No       | Key manager type (defaults to config setting)            |

**Notes:**

- Omitting `--serial` cancels a fungible token airdrop; providing it cancels an NFT airdrop
- Batch and schedule support: pass `--batch <name>` or `--schedule <name>`

**Implementation:** [`src/plugins/token/commands/cancel-airdrop/handler.ts`](./commands/cancel-airdrop/handler.ts)

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

### Token Allowance FT

Approve (or revoke) a spender allowance for fungible tokens on behalf of the owner. Set amount to `0` to revoke an existing allowance.

```bash
# Approve allowance using aliases
hcli token allowance-ft \
  --token mytoken-alias \
  --owner alice \
  --spender bob \
  --amount 500

# Approve using token ID and account-id:key pairs
hcli token allowance-ft \
  --token 0.0.123456 \
  --owner 0.0.111111:302e020100300506032b657004220420... \
  --spender 0.0.222222 \
  --amount 1000t

# Revoke allowance (set amount to 0)
hcli token allowance-ft \
  --token mytoken-alias \
  --owner alice \
  --spender bob \
  --amount 0
```

**Parameters:**

- `--token` / `-T`: Token identifier (alias or token ID) - **Required**
- `--owner` / `-o`: Owner account. Accepts any key format (alias, `accountId:privateKey`, key reference) - **Required**
- `--spender` / `-s`: Spender account (ID or alias) - **Required**
- `--amount` / `-a`: Allowance amount - **Required**
  - Display units (default): `100` (will be multiplied by token decimals)
  - Base units: `100t` (raw amount without decimals)
  - `0` to revoke the allowance
- `--key-manager` / `-k`: Key manager type (optional, defaults to config setting)
  - `local` or `local_encrypted`

**Batch support:** Pass `--batch <batch-name>` to add to a batch instead of executing immediately.

**Output:**

```json
{
  "tokenId": "0.0.123456",
  "ownerAccountId": "0.0.111111",
  "spenderAccountId": "0.0.222222",
  "amount": "100000",
  "transactionId": "0.0.111111@1700000000.123456789",
  "network": "testnet"
}
```

**Note:** Amount in the output is always in base units (raw). The token must have been associated with the spender account before the allowance can be used.

### Token Delete

Delete a token from the Hedera network and remove it from local state. The token must have an admin key to be deleted from the network.

```bash
# Delete by token alias (network delete)
hcli token delete --token mytoken-alias

# Delete by token ID (network delete)
hcli token delete --token 0.0.123456

# Provide admin key explicitly
hcli token delete --token 0.0.123456 --admin-key <key-ref>

# Threshold / KeyList admin key: pass multiple `--admin-key` values
hcli token delete --token 0.0.123456 --admin-key alice --admin-key bob

# Remove from local state only (no network transaction)
hcli token delete --token mytoken-alias --state-only
```

**Parameters:**

- `--token` / `-T`: Token identifier: either a token alias or token-id - **Required**
- `--admin-key`: Admin key credential(s) for signing - **Optional** (auto-resolved from the key manager from on-chain public keys when not passed). **Repeatable** for KeyList / threshold admin keys
- `--key-manager`: Key manager type, defaults to config setting - **Optional**
- `--state-only`: Remove token from local state only, without a network transaction - **Optional**

`--state-only` and `--admin-key` are mutually exclusive. Any aliases associated with the token on the current network will also be removed.

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
  "metadataKey": "<alias or accountId:privateKey>",
  "freezeDefault": false,
  "autoRenewPeriod": 7776000,
  "autoRenewAccountId": "<accountId>",
  "expirationTime": "2027-01-01T00:00:00Z",
  "memo": "Optional token memo",
  "autoRenewPeriod": "86400",
  "autoRenewAccount": "<alias or accountId:privateKey>",
  "expirationTime": "2030-12-31T23:59:59.000Z",
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

Optional lifecycle fields (same rules as `token create-ft`):

- `autoRenewPeriod`: string or number; parsed to seconds (plain number = seconds; suffixes `s`, `m`, `h`, `d` supported). **Requires** `autoRenewAccount` when set.
- `autoRenewAccount`: account that pays auto-renewal (same key formats as other keys).
- `expirationTime`: ISO 8601 string. Ignored with a warning if both `autoRenewPeriod` and `autoRenewAccount` are set.

**Supported formats for treasury and keys:**

- **Alias**: `"my-account"` - resolved via alias service
- **Account with key**: `"0.0.123456:privateKey"`
- **Account ID only**: `"0.0.123456"`
- **Public key**: `"ed25519:public:hex-key"` or `"ecdsa:public:hex-key"`
- **Private key**: `"ed25519:private:hex-key"` or `"ecdsa:private:hex-key"`
- **Key reference**: `"kr_xxx"` - managed by key manager

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
  "metadataKey": "<alias or accountId:privateKey>",
  "freezeDefault": false,
  "autoRenewPeriod": 7776000,
  "autoRenewAccountId": "<accountId>",
  "expirationTime": "2027-01-01T00:00:00Z",
  "memo": "Optional NFT collection memo",
  "associations": ["<alias or accountId:privateKey>", "..."]
}
```

**Supported formats for treasury and keys:**

- **Alias**: `"my-account"` - resolved via alias service
- **Account with key**: `"0.0.123456:privateKey"`
- **Account ID only**: `"0.0.123456"`
- **Public key**: `"ed25519:public:hex-key"` or `"ecdsa:public:hex-key"`
- **Private key**: `"ed25519:private:hex-key"` or `"ecdsa:private:hex-key"`
- **Key reference**: `"kr_xxx"` - managed by key manager

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

### Key Format

All key parameters accept any of the following formats:

- **Alias**: `"my-account"` - resolved via alias service
- **Account with private key**: `"0.0.123456:privateKey"`
- **Account ID only**: `"0.0.123456"`
- **Public key with type prefix**: `"ed25519:public:hex-key"` or `"ecdsa:public:hex-key"`
- **Private key with type prefix**: `"ed25519:private:hex-key"` or `"ecdsa:private:hex-key"`
- **Key reference**: `"kr_xxx"` - managed by key manager
- **EVM address**: `"0x..."` (where supported)

## 📦 Batch Support

The following token commands support the `--batch` / `-B` flag via the batch plugin's `batchify` hook:

- `create-ft` – `TokenCreateFtBatchStateHook` persists FT state after batch execution
- `create-nft` – `TokenCreateNftBatchStateHook` persists NFT state after batch execution
- `create-ft-from-file` – `TokenCreateFtFromFileBatchStateHook` persists FT-from-file state
- `create-nft-from-file` – `TokenCreateNftFromFileBatchStateHook` persists NFT-from-file state
- `associate` – `TokenAssociateBatchStateHook` persists association results
- `burn-ft`, `mint-ft`, `mint-nft`, `transfer-ft`, `transfer-nft`, `allowance-nft`, `allowance-ft`, `delete-allowance-nft` – can be batched (no state hook; transactions execute atomically)

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
  adminPublicKey?: string;
  supplyPublicKey?: string;
  wipePublicKey?: string;
  kycPublicKey?: string;
  freezePublicKey?: string;
  pausePublicKey?: string;
  feeSchedulePublicKey?: string;
  metadataPublicKey?: string;
  keys: TokenKeys;
  network: 'mainnet' | 'testnet' | 'previewnet' | 'localnet';
  associations: TokenAssociation[];
  customFees: CustomFee[];
}
```

**Field Descriptions:**

- `tokenType`: Discriminates fungible tokens (`FUNGIBLE_COMMON`) from NFT collections (`NON_FUNGIBLE_UNIQUE`)
- `decimals`: Number of decimal places for fungible tokens; zero for NFTs
- `initialSupply`: Initial supply amount; zero for NFTs
- `adminPublicKey`: Public key with admin privileges for token operations
- `supplyPublicKey`: Public key authorized to mint/burn tokens
- `wipePublicKey`: Public key authorized to wipe token balances
- `kycPublicKey`: Public key authorized to grant/revoke KYC status
- `freezePublicKey`: Public key authorized to freeze token transfers
- `pausePublicKey`: Public key authorized to pause all token transfers
- `feeSchedulePublicKey`: Public key authorized to update custom fees
- `metadataPublicKey`: Public key authorized to update token metadata

NFT tokens use zero for `decimals` and `initialSupply`; minted NFTs are tracked by serial number on the ledger. The schema is validated using Zod (`TokenDataSchema`) and stored as JSON Schema in the plugin manifest for runtime validation.

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

**Fungible Token Create:**

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

**Non-Fungible Token Create:**

```
✅ NFT created successfully: 0.0.123456
   Name: My NFT Collection (MNFT)
   Treasury: 0.0.111
   Supply Type: FINITE
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

**Non-Fungible Token Create:**

```json
{
  "tokenId": "0.0.123456",
  "name": "My NFT Collection",
  "symbol": "MNFT",
  "treasuryId": "0.0.111",
  "supplyType": "FINITE",
  "transactionId": "0.0.123@1700000000.123456789",
  "adminPublicKey": "302e020100300506032b657004220420...",
  "supplyPublicKey": "302e020100300506032b657004220420...",
  "freezePublicKey": "302e020100300506032b657004220420...",
  "wipePublicKey": "302e020100300506032b657004220420...",
  "kycPublicKey": "302e020100300506032b657004220420...",
  "pausePublicKey": "302e020100300506032b657004220420...",
  "feeSchedulePublicKey": "302e020100300506032b657004220420...",
  "metadataPublicKey": "302e020100300506032b657004220420...",
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
