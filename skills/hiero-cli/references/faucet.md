# faucet plugin

Request HBAR from the Hedera Portal faucet on testnet or previewnet.

## Prerequisites

A Hedera Portal Personal Access Token (PAT) must be configured:

```
hcli config set --portal_pat <your-token>
```

To obtain a PAT: https://docs.hedera.com/native/tutorials/getting-started/create-api-key

## Constraints

- Only available on `testnet` and `previewnet` (not mainnet or localnet)
- Up to 100 HBAR per request
- Up to 100 HBAR per 24-hour rolling window (shared with the web faucet)
- One disbursement per destination address per 24 hours

---

### `hcli faucet request`

Send HBAR to an account on testnet or previewnet.

| Option        | Short | Type   | Required | Description                                                        |
| ------------- | ----- | ------ | -------- | ------------------------------------------------------------------ |
| `--recipient` | `-r`  | string | **yes**  | Account alias, Hedera account ID (`0.0.x`), or EVM address (`0x…`) |
| `--amount`    | `-a`  | number | no       | HBAR to request (1–100, default: 100)                              |

**Examples:**

```
hcli faucet request --recipient myAccount
hcli faucet request --recipient 0.0.12345 --amount 50
hcli faucet request -r 0.0.12345 -a 50
hcli faucet request --recipient 0xabc...def --amount 10 -N previewnet
```

**Output:** `{ recipient, amount, transactionId, network, quotaUsed, quotaRemaining }`
