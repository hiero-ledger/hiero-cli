# Batch Plugin

The Batch Plugin provides bulk operation capabilities for the Hiero CLI, enabling efficient batch processing of HBAR and token transfers from CSV files.

## Overview

This plugin solves a common pain point for Hedera developers: performing repetitive transfer operations. Instead of executing transfers one at a time, you can define all transfers in a CSV file and process them in a single batch operation.

**Use cases:**

- Token airdrops to multiple recipients
- Payroll/reward distributions
- Batch refunds
- Testnet account funding
- Community token distributions

## Commands

### `batch hbar-transfer`

Transfer HBAR to multiple accounts from a CSV file.

```bash
# Basic usage
hcli batch hbar-transfer -f transfers.csv

# Dry run (validate without executing)
hcli batch hbar-transfer -f transfers.csv --dry-run

# Continue on error (don't stop if one transfer fails)
hcli batch hbar-transfer -f transfers.csv --continue-on-error

# Specify source account
hcli batch hbar-transfer -f transfers.csv --from my-treasury
```

**CSV Format:**

```csv
to,amount,memo
0.0.12345,10,Payment 1
0.0.12346,25.5,Payment 2
0.0.12347,100t,Payment 3 (100 tinybars)
```

| Column   | Required | Description                                                    |
| -------- | -------- | -------------------------------------------------------------- |
| `to`     | Yes      | Destination account ID (e.g., `0.0.12345`)                     |
| `amount` | Yes      | Amount to transfer. Default: HBAR. Add `t` suffix for tinybars |
| `memo`   | No       | Optional transaction memo (max 100 chars)                      |

### `batch token-transfer`

Transfer fungible tokens to multiple accounts from a CSV file.

```bash
# Basic usage
hcli batch token-transfer -f transfers.csv -T 0.0.99999

# Using token alias
hcli batch token-transfer -f transfers.csv -T my-token

# With dry run
hcli batch token-transfer -f transfers.csv -T my-token --dry-run
```

**CSV Format:**

```csv
to,amount,memo
0.0.12345,1000,Airdrop batch 1
0.0.12346,500,Airdrop batch 1
0.0.12347,250t,Raw token units
```

| Column   | Required | Description                                                        |
| -------- | -------- | ------------------------------------------------------------------ |
| `to`     | Yes      | Destination account ID                                             |
| `amount` | Yes      | Amount to transfer. Default: display units. Add `t` for base units |
| `memo`   | No       | Optional transaction memo                                          |

### `batch summary`

View recent batch operations.

```bash
# Show last 10 operations
hcli batch summary

# Show last 5 operations
hcli batch summary --limit 5
```

## Options Reference

### Common Options

| Option                | Short | Type    | Description                                    |
| --------------------- | ----- | ------- | ---------------------------------------------- |
| `--file`              | `-f`  | string  | Path to CSV file (required)                    |
| `--from`              | `-F`  | string  | Source account alias or `accountId:privateKey` |
| `--dry-run`           | `-d`  | boolean | Validate without executing                     |
| `--continue-on-error` | `-c`  | boolean | Continue if a transfer fails                   |
| `--key-manager`       | `-k`  | string  | Key manager: `local` or `local_encrypted`      |

### Token Transfer Only

| Option    | Short | Type   | Description                  |
| --------- | ----- | ------ | ---------------------------- |
| `--token` | `-T`  | string | Token ID or alias (required) |

## Output Formats

### Human-Readable (default)

```
✅ Batch HBAR Transfer Complete

📊 Summary
   Batch ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
   Network: testnet
   Source File: transfers.csv
   Total Transfers: 3
   ✓ Successful: 2
   ✗ Failed: 1
   ⊘ Skipped: 0
   Total Amount: 135500000

📝 Results:
   ✓ [0] 0.0.12345 - 10
   ✓ [1] 0.0.12346 - 25.5
   ✗ [2] 0.0.12347 - 100t (INSUFFICIENT_PAYER_BALANCE)
```

### JSON Format

```bash
hcli batch hbar-transfer -f transfers.csv --format json
```

```json
{
  "batchId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "network": "testnet",
  "sourceFile": "transfers.csv",
  "totalTransfers": 3,
  "successCount": 2,
  "failedCount": 1,
  "skippedCount": 0,
  "totalAmount": "135500000",
  "results": [
    {
      "index": 0,
      "to": "0.0.12345",
      "amount": "10",
      "status": "success",
      "transactionId": "0.0.123@1234567890.123456789"
    },
    {
      "index": 1,
      "to": "0.0.12346",
      "amount": "25.5",
      "status": "success",
      "transactionId": "0.0.123@1234567890.223456789"
    },
    {
      "index": 2,
      "to": "0.0.12347",
      "amount": "100t",
      "status": "failed",
      "error": "INSUFFICIENT_PAYER_BALANCE"
    }
  ]
}
```

## Best Practices

### 1. Always Dry Run First

Before executing a large batch, validate with `--dry-run`:

```bash
hcli batch hbar-transfer -f airdrop.csv --dry-run
```

This catches CSV formatting issues and invalid account IDs without spending HBAR.

### 2. Use Continue-on-Error for Large Batches

For large distributions where some failures are acceptable:

```bash
hcli batch token-transfer -f airdrop.csv -T my-token --continue-on-error
```

Failed transfers are logged in the results, and the batch continues.

### 3. Keep CSVs Small for Safety

For very large distributions (1000+ transfers), consider:

- Breaking into smaller batches of 100-200 transfers
- Running each batch sequentially
- Verifying success before proceeding

### 4. Check Account Associations

For token transfers, ensure recipient accounts are associated with the token:

```bash
# Before batch transfer, you may need to:
hcli token associate -T my-token -a recipient-account
```

## Error Handling

The plugin handles errors gracefully:

| Error Type           | Behavior                                               |
| -------------------- | ------------------------------------------------------ |
| Invalid CSV format   | Fails immediately with validation errors               |
| Invalid account ID   | Records as failed, continues if `--continue-on-error`  |
| Insufficient balance | Records as failed, continues if `--continue-on-error`  |
| Network errors       | Records as failed, continues if `--continue-on-error`  |
| Self-transfers       | Skipped automatically (can't transfer to same account) |

## State Storage

Batch operations are stored in state under the `batch-operations` namespace. This enables:

- Viewing batch history with `batch summary`
- Auditing past distributions
- Debugging failed transfers

## Examples

### Example 1: Testnet Funding

Fund multiple testnet accounts for development:

```csv
to,amount,memo
0.0.100001,100,Dev account 1
0.0.100002,100,Dev account 2
0.0.100003,100,Dev account 3
```

```bash
hcli batch hbar-transfer -f dev-accounts.csv
```

### Example 2: Token Airdrop

Distribute tokens to community members:

```csv
to,amount,memo
0.0.200001,1000,Community airdrop
0.0.200002,500,Community airdrop
0.0.200003,2500,Top contributor bonus
```

```bash
hcli batch token-transfer -f airdrop.csv -T community-token
```

### Example 3: Scripted Distribution

Combine with other tools for automated distributions:

```bash
#!/bin/bash
# Generate CSV from database
python generate_payouts.py > payouts.csv

# Dry run first
hcli batch hbar-transfer -f payouts.csv --dry-run --format json

# If validation passes, execute
hcli batch hbar-transfer -f payouts.csv --continue-on-error --format json > results.json

# Process results
python process_results.py results.json
```

## Related Commands

- `hbar transfer` - Single HBAR transfer
- `token transfer-ft` - Single fungible token transfer
- `account list` - List stored accounts
- `token list` - List stored tokens
