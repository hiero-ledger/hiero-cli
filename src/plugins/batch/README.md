# Batch Operations Plugin

CSV-driven bulk operations for the Hedera network. Execute hundreds of transfers
or mints in a single command instead of running them one at a time.

## Commands

| Command               | Description                                                            |
| --------------------- | ---------------------------------------------------------------------- |
| `batch transfer-hbar` | Batch HBAR transfers from a CSV file                                   |
| `batch transfer-ft`   | Batch fungible token transfers from a CSV file                         |
| `batch mint-nft`      | Batch mint NFTs from a CSV file                                        |
| `batch airdrop`       | Batch airdrop tokens from a CSV (auto-handles association via HIP-904) |

## Quick Start

```bash
# 1. Ensure you have a network and operator configured
hiero network use testnet
hiero network set-operator --account-id 0.0.XXXXX --private-key <key>

# 2. Create a CSV file (or use the examples in src/plugins/batch/examples/)

# 3. Dry-run to validate before executing
hiero batch transfer-hbar --file transfers.csv --dry-run

# 4. Execute for real
hiero batch transfer-hbar --file transfers.csv
```

## batch transfer-hbar

Transfer HBAR to multiple recipients from a single CSV file.

### CSV Format

| Column   | Required | Description                                                            |
| -------- | -------- | ---------------------------------------------------------------------- |
| `to`     | Yes      | Destination account (ID like `0.0.12345` or stored alias like `alice`) |
| `amount` | Yes      | HBAR amount. `10` = 10 HBAR, `100t` = 100 tinybars                     |
| `memo`   | No       | Per-transfer memo (overrides `--memo` flag)                            |

### Example CSV

```csv
to,amount,memo
0.0.12345,10,payment-batch-1
0.0.67890,5.5,payment-batch-1
alice,2,tip
bob,1.25,refund
```

### Usage

```bash
# Dry run (validate only, no transactions)
hiero batch transfer-hbar --file hbar-transfers.csv --dry-run

# Execute transfers from operator account
hiero batch transfer-hbar --file hbar-transfers.csv

# Execute from a specific account
hiero batch transfer-hbar --file hbar-transfers.csv --from alice

# With a default memo for all transfers
hiero batch transfer-hbar --file hbar-transfers.csv --memo "March payroll"

# JSON output for scripting
hiero batch transfer-hbar --file hbar-transfers.csv --format json
```

### Example Output

```
✅ Batch HBAR transfer complete!

From: 0.0.100000
Network: testnet
Total: 4 | Succeeded: 3 | Failed: 1

  Row 1: success — https://hashscan.io/testnet/transaction/0.0.100000@1700000000.123456789
  Row 2: success — https://hashscan.io/testnet/transaction/0.0.100000@1700000001.123456789
  Row 3: success — https://hashscan.io/testnet/transaction/0.0.100000@1700000002.123456789
  Row 4: failed — Invalid destination: "unknown-alias" is neither a valid account ID nor a known alias

⚠️  1 transfer(s) failed. Fix the errors above and re-run with a CSV containing only the failed rows.
```

## batch transfer-ft

Transfer a fungible token to multiple recipients from a single CSV file.

### CSV Format

| Column   | Required | Description                                                  |
| -------- | -------- | ------------------------------------------------------------ |
| `to`     | Yes      | Destination account (ID or alias)                            |
| `amount` | Yes      | Token amount. `100` = display units, `100t` = raw base units |

### Example CSV

```csv
to,amount
0.0.12345,1000
0.0.67890,500
alice,250
bob,100
```

### Usage

```bash
# Dry run
hiero batch transfer-ft --file ft-transfers.csv --token my-token --dry-run

# Execute transfers using token alias
hiero batch transfer-ft --file ft-transfers.csv --token my-token

# Execute transfers using token ID
hiero batch transfer-ft --file ft-transfers.csv --token 0.0.98765

# From a specific account (not the operator)
hiero batch transfer-ft --file ft-transfers.csv --token my-token --from alice
```

## batch mint-nft

Mint multiple NFTs to an existing collection from a CSV file.

### CSV Format

| Column     | Required | Description                                           |
| ---------- | -------- | ----------------------------------------------------- |
| `metadata` | Yes      | NFT metadata string (max 100 bytes). Typically a URI. |

### Example CSV

```csv
metadata
https://example.com/nft/1.json
https://example.com/nft/2.json
ipfs://QmXyz123456789abcdef/3.json
```

### Usage

```bash
# Dry run (validates metadata sizes, token type, supply capacity)
hiero batch mint-nft --file nft-metadata.csv --token my-nft --supply-key supply-account --dry-run

# Mint NFTs
hiero batch mint-nft --file nft-metadata.csv --token my-nft --supply-key supply-account

# Using token ID and explicit key
hiero batch mint-nft --file nft-metadata.csv --token 0.0.98765 --supply-key 0.0.12345:302e...
```

### Example Output

```
✅ Batch NFT mint complete!

Token: https://hashscan.io/testnet/token/0.0.98765
Network: testnet
Total: 3 | Succeeded: 3 | Failed: 0

  Row 1: success — Serial #1 — https://hashscan.io/testnet/transaction/...
  Row 2: success — Serial #2 — https://hashscan.io/testnet/transaction/...
  Row 3: success — Serial #3 — https://hashscan.io/testnet/transaction/...
```

## batch airdrop

Airdrop fungible tokens to multiple recipients using Hedera's native
`TokenAirdropTransaction` (HIP-904). Unlike `transfer-ft`, airdrop
**auto-handles token association** — recipients do NOT need to pre-associate.

How it works:

- **Already associated** accounts receive tokens immediately
- Accounts with **auto-association slots** get associated + receive immediately
- Other accounts get a **pending airdrop** they can claim later via the Hedera portal

Only the sender signs — no recipient keys required.

### CSV Format

| Column   | Required | Description                                                  |
| -------- | -------- | ------------------------------------------------------------ |
| `to`     | Yes      | Destination account (ID or alias)                            |
| `amount` | Yes      | Token amount. `100` = display units, `100t` = raw base units |

### Example CSV

```csv
to,amount
0.0.12345,5000
alice,2500
bob,1000
```

### Usage

```bash
# Dry run
hiero batch airdrop --file airdrop.csv --token my-token --dry-run

# Execute airdrop (recipients auto-associated if possible)
hiero batch airdrop --file airdrop.csv --token my-token

# From a specific account
hiero batch airdrop --file airdrop.csv --token 0.0.98765 --from treasury
```

### Example Output

```
✅ Batch airdrop complete!

Token: https://hashscan.io/testnet/token/0.0.98765
From: 0.0.100000
Network: testnet
Total: 3 | Succeeded: 3 | Failed: 0

  Row 1: success — https://hashscan.io/testnet/transaction/...
  Row 2: success — https://hashscan.io/testnet/transaction/...
  Row 3: success — https://hashscan.io/testnet/transaction/...
```

### When to use `airdrop` vs `transfer-ft`

| Scenario                                     | Use           |
| -------------------------------------------- | ------------- |
| Recipients are already associated with token | `transfer-ft` |
| Recipients may NOT be associated yet         | `airdrop`     |
| You don't have recipients' private keys      | `airdrop`     |
| Token distribution to new community members  | `airdrop`     |
| Internal transfers between your own accounts | `transfer-ft` |

## Demo Script

A full end-to-end demo script is available at `examples/scripts/batch-operations-demo.sh`.
It creates accounts, performs batch HBAR transfers, creates a token, and runs a batch airdrop
— all from CSV files.

```bash
# Set your testnet operator credentials
export HEDERA_OPERATOR_ACCOUNT_ID=0.0.XXXXX
export HEDERA_OPERATOR_KEY=302e...

# Build and run
npm run build
./examples/scripts/batch-operations-demo.sh
```

## Features

- **CSV input**: Simple, spreadsheet-friendly format for bulk data
- **Dry-run mode**: Validate all rows before spending any HBAR (`--dry-run`)
- **Account aliases**: Use stored account names (`alice`, `bob`) alongside raw IDs
- **Amount formats**: Display units (`10` HBAR, `100` tokens) or base units (`100t`)
- **Per-row results**: See exactly which rows succeeded or failed
- **Transaction links**: HashScan links for every successful transaction
- **Retry guidance**: Failed rows are clearly identified for re-run
- **JSON output**: Machine-readable output with `--format json` for CI/CD pipelines
- **Supply validation**: NFT mints check max supply capacity before starting
- **Native airdrop**: Uses Hedera's `TokenAirdropTransaction` (HIP-904) for auto-association

## Error Handling

The plugin validates all rows **before** executing any transactions:

1. **CSV structure**: Missing headers, wrong column count, empty files
2. **Field validation**: Empty fields, invalid amounts, unresolvable aliases
3. **Token validation** (mint-nft): Token type, supply key match, supply capacity
4. **Per-row errors**: If a transaction fails mid-batch, the remaining rows still execute

Failed rows are reported with clear error messages. Create a new CSV with only the
failed rows and re-run to retry.

## JSON Output Schema

When using `--format json`, the output includes:

```json
{
  "total": 4,
  "succeeded": 3,
  "failed": 1,
  "fromAccount": "0.0.100000",
  "network": "testnet",
  "dryRun": false,
  "results": [
    {
      "row": 1,
      "status": "success",
      "to": "0.0.12345",
      "amount": "10",
      "transactionId": "0.0.100000@1700000000.123456789"
    },
    {
      "row": 2,
      "status": "failed",
      "to": "0.0.67890",
      "amount": "5",
      "errorMessage": "Transfer failed: INSUFFICIENT_PAYER_BALANCE"
    }
  ]
}
```
