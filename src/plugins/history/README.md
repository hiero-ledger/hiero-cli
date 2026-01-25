# History Plugin

Query transaction history for Hedera accounts using the Mirror Node API.

## Commands

### `history list`

List recent transactions for an account.

```bash
# List transactions for an account by ID
hiero history list -a 0.0.12345

# List transactions for a stored account alias
hiero history list -a myaccount

# Limit results to 10 transactions
hiero history list -a 0.0.12345 -l 10

# Filter by transaction type
hiero history list -a 0.0.12345 -t cryptotransfer

# Filter by result (success/fail)
hiero history list -a 0.0.12345 -r success

# Combine filters
hiero history list -a 0.0.12345 -l 50 -t tokentransfers -r success
```

## Options

| Option      | Short | Type   | Required | Default | Description                              |
| ----------- | ----- | ------ | -------- | ------- | ---------------------------------------- |
| `--account` | `-a`  | string | Yes      | -       | Account ID, EVM address, or stored alias |
| `--limit`   | `-l`  | number | No       | 25      | Max transactions to return (1-100)       |
| `--type`    | `-t`  | string | No       | all     | Filter by transaction type               |
| `--result`  | `-r`  | string | No       | all     | Filter by result (all, success, fail)    |

### Transaction Types

- `cryptotransfer` - HBAR transfers
- `cryptoapproveallowance` - Allowance approvals
- `tokenassociate` - Token associations
- `tokendissociate` - Token dissociations
- `tokentransfers` - Token transfers
- `contractcall` - Smart contract calls
- `contractcreate` - Smart contract creation

## Output

### Human-readable format

```
📜 Transaction History for 0.0.12345
Network: testnet
Showing 5 transaction(s)

────────────────────────────────────────
🔹 CRYPTOTRANSFER | SUCCESS
   ID: 0.0.12345@1706035200.123456789
   Time: 1706035200.123456789
   Fee: 100000 tinybars
   Transfers:
     0.0.12345: -1000000 tinybars
     0.0.67890: 1000000 tinybars
...
```

### JSON format

```bash
hiero history list -a 0.0.12345 --json
```

```json
{
  "accountId": "0.0.12345",
  "network": "testnet",
  "transactions": [
    {
      "transactionId": "0.0.12345@1706035200.123456789",
      "consensusTimestamp": "1706035200.123456789",
      "type": "CRYPTOTRANSFER",
      "result": "SUCCESS",
      "chargedFee": 100000,
      "transfers": [
        { "account": "0.0.12345", "amount": -1000000 },
        { "account": "0.0.67890", "amount": 1000000 }
      ]
    }
  ],
  "totalCount": 1
}
```

## Use Cases

1. **Debugging transactions**: Quickly check recent transactions to debug issues
2. **Audit trail**: Review account activity for compliance or security
3. **Balance verification**: Understand where HBAR/tokens went
4. **Contract monitoring**: Track smart contract interactions
5. **Workflow automation**: Integrate with scripts using JSON output

## Notes

- Data is fetched from the Hedera Mirror Node (read-only, no signing required)
- Mirror Node has a 60-day default range limit; older transactions require explicit timestamp filters
- Results are ordered by consensus timestamp (most recent first)
- Works on mainnet, testnet, previewnet, and localnet
