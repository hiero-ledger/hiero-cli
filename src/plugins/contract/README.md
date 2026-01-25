# Smart Contract Plugin

Deploy, call, and manage Hedera smart contracts from the command line.

## Commands

### `contract deploy`

Deploy a smart contract to the Hedera network using bytecode from a file.

```bash
# Basic deployment
hcli contract deploy -b ./MyContract.bin -g 100000

# With initial balance and memo
hcli contract deploy -b ./MyContract.bin -g 100000 -i 10 -m "My Contract"

# With initial balance in tinybars
hcli contract deploy -b ./MyContract.bin -g 100000 -i 1000000000t
```

**Options:**

- `-b, --bytecode-file` (required): Path to file containing contract bytecode (hex-encoded or binary)
- `-g, --gas` (required): Gas limit for contract deployment
- `-p, --constructor-params`: Constructor parameters as JSON array
- `-i, --initial-balance`: Initial HBAR balance for the contract
- `-m, --memo`: Contract memo (max 100 bytes)
- `-a, --admin-key`: Admin key for the contract

### `contract call`

Execute a read-only call to a smart contract function. This is free of charge.

```bash
# Call a simple getter function
hcli contract call -c 0.0.123456 -f "getValue"

# Call with parameters
hcli contract call -c 0.0.123456 -f "balanceOf" -p '["0x1234..."]'

# With custom gas limit
hcli contract call -c 0.0.123456 -f "complexQuery" -g 50000
```

**Options:**

- `-c, --contract` (required): Contract ID (e.g., 0.0.123456)
- `-f, --function` (required): Function name to call
- `-p, --params`: Function parameters as JSON array
- `-g, --gas`: Gas limit for the call (default: 30000)

### `contract info`

Get detailed information about a smart contract from the Mirror Node.

```bash
hcli contract info -c 0.0.123456
```

**Options:**

- `-c, --contract` (required): Contract ID (e.g., 0.0.123456)

## Bytecode File Format

The `contract deploy` command accepts bytecode in two formats:

1. **Hex-encoded text file** (`.bin` or `.hex`):

   ```
   608060405234801561001057600080fd5b50...
   ```

   or with 0x prefix:

   ```
   0x608060405234801561001057600080fd5b50...
   ```

2. **Binary file**: Raw compiled bytecode

## Examples

### Deploy and Interact with a Simple Contract

```bash
# 1. Deploy the contract
hcli contract deploy -b ./SimpleStorage.bin -g 100000 -m "Simple Storage"

# Output:
# ✅ Smart Contract Deployed Successfully
#    Contract ID: 0.0.123456
#    Transaction: 0.0.2@1234567890.123456789
#    Bytecode Size: 1024 bytes
#    Memo: Simple Storage
#    Timestamp: 2026-01-24T12:00:00.000Z

# 2. Call a view function
hcli contract call -c 0.0.123456 -f "get"

# 3. Get contract info
hcli contract info -c 0.0.123456
```

### Parameter Types

When calling contract functions with parameters, use JSON array format:

```bash
# String parameter
hcli contract call -c 0.0.123456 -f "setName" -p '["Alice"]'

# Number parameter
hcli contract call -c 0.0.123456 -f "setValue" -p '[42]'

# Address parameter (Ethereum format)
hcli contract call -c 0.0.123456 -f "setOwner" -p '["0x1234567890abcdef1234567890abcdef12345678"]'

# Multiple parameters
hcli contract call -c 0.0.123456 -f "transfer" -p '["0x1234...", 100]'

# Boolean parameter
hcli contract call -c 0.0.123456 -f "setEnabled" -p '[true]'
```

## Error Handling

Common errors and solutions:

| Error                      | Cause                  | Solution                  |
| -------------------------- | ---------------------- | ------------------------- |
| `INSUFFICIENT_GAS`         | Gas limit too low      | Increase `-g` value       |
| `CONTRACT_REVERT_EXECUTED` | Contract reverted      | Check function parameters |
| `INVALID_CONTRACT_ID`      | Contract doesn't exist | Verify contract ID        |
| `FILE_NOT_FOUND`           | Bytecode file missing  | Check file path           |

## Technical Details

- **ContractCreateFlow**: Used for deployment, automatically handles file creation and chunking for large contracts
- **ContractCallQuery**: Used for read-only calls, no transaction fees
- **Mirror Node API**: Used for contract info queries

## Hedera Smart Contract Limits

- Maximum contract bytecode: ~100 MB (spread across files)
- Maximum gas per contract call: 15 million
- Maximum gas throttle: 15 million gas/second
- Contract call/create throttle: 8 million gas/second
