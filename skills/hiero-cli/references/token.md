# token plugin

Manage Hedera fungible tokens (FT) and non-fungible tokens (NFT): create, mint, transfer, associate, list, view, import, delete.

## Batch-compatible commands

Commands marked **[batchify]** support the `--batch <name>` flag to queue into a batch instead of executing immediately.

---

### `hcli token create-ft` [batchify]

Create a new fungible token with specified properties.

| Option                   | Short | Type       | Required | Default        | Description                                                                                                          |
| ------------------------ | ----- | ---------- | -------- | -------------- | -------------------------------------------------------------------------------------------------------------------- |
| `--token-name`           | `-T`  | string     | **yes**  | —              | Token name                                                                                                           |
| `--symbol`               | `-Y`  | string     | **yes**  | —              | Token symbol                                                                                                         |
| `--treasury`             | `-t`  | string     | no       | operator       | Treasury account: `accountId:privateKey`, key reference, or alias                                                    |
| `--decimals`             | `-d`  | number     | no       | `0`            | Number of decimal places                                                                                             |
| `--initial-supply`       | `-i`  | string     | no       | `1000000`      | Initial supply. Default: display units. Append `"t"` for raw units                                                   |
| `--supply-type`          | `-S`  | string     | no       | `INFINITE`     | Supply type: `INFINITE` or `FINITE`                                                                                  |
| `--max-supply`           | `-m`  | string     | no       | —              | Max supply (required when `supply-type=FINITE`). Append `"t"` for raw units                                          |
| `--admin-key`            | `-a`  | repeatable | no       | operator key   | Admin key(s). Pass multiple times for KeyList / threshold admin keys. Same credential formats as `hcli account` help |
| `--admin-key-threshold`  | `-A`  | number     | no       | —              | M-of-N for threshold admin keys (use when multiple `--admin-key` entries participate in an M-of-N policy)            |
| `--supply-key`           | `-s`  | repeatable | no       | —              | Supply key(s). Pass multiple times for KeyList / threshold supply keys. Same formats as CLI key options              |
| `--supply-key-threshold` | `-L`  | number     | no       | —              | M-of-N for threshold supply keys (use when multiple `--supply-key` entries participate in an M-of-N policy)          |
| `--name`                 | `-n`  | string     | no       | —              | Local alias to register for this token                                                                               |
| `--key-manager`          | `-k`  | string     | no       | config default | Key manager: `local` or `local_encrypted`                                                                            |
| `--memo`                 | `-M`  | string     | no       | —              | Token memo (max 100 chars)                                                                                           |
| `--auto-renew-period`    | `-R`  | string     | no       | —              | Auto-renew interval: integer = seconds, or suffix `s` / `m` / `h` / `d`. Requires `--auto-renew-account`             |
| `--auto-renew-account`   | `-r`  | string     | no       | —              | Account that pays auto-renewal (alias, `accountId:key`, key reference, etc.)                                         |
| `--expiration-time`      | `-x`  | string     | no       | —              | Fixed expiration (ISO 8601). Ignored (with warning) if auto-renew period + account are set                           |
| `--batch`                | `-B`  | string     | no       | —              | Queue into a named batch instead of executing immediately                                                            |

**Example:**

```
hcli token create-ft --token-name "MyToken" --symbol MTK --decimals 2 --initial-supply 1000000 --name mytoken
hcli token create-ft --token-name "MyToken" --symbol MTK --batch myBatch
```

**Output:** `{ tokenId, name, symbol, treasuryId, decimals, initialSupply, supplyType, transactionId, alias?, network, autoRenewPeriodSeconds?, autoRenewAccountId?, expirationTime? }` — `expirationTime` is an ISO string when fixed expiration was used; lifecycle fields are omitted when not set.

**Repeatable keys:** Besides `--admin-key` / `--supply-key`, role options such as `--freeze-key`, `--wipe-key`, `--kyc-key`, `--pause-key`, `--fee-schedule-key`, and `--metadata-key` are repeatable; each has a matching `-*-threshold` flag for M-of-N policies. Use `hcli token create-ft --help` for the full list.

---

### `hcli token create-nft` [batchify]

Create a new non-fungible token collection.

| Option                   | Short | Type       | Required | Default        | Description                                                            |
| ------------------------ | ----- | ---------- | -------- | -------------- | ---------------------------------------------------------------------- |
| `--token-name`           | `-T`  | string     | **yes**  | —              | Token name                                                             |
| `--symbol`               | `-Y`  | string     | **yes**  | —              | Token symbol                                                           |
| `--treasury`             | `-t`  | string     | no       | operator       | Treasury account: `accountId:privateKey`, key reference, or alias      |
| `--supply-type`          | `-S`  | string     | no       | `INFINITE`     | Supply type: `INFINITE` or `FINITE`                                    |
| `--max-supply`           | `-m`  | string     | no       | —              | Max supply. Append `"t"` for raw units                                 |
| `--admin-key`            | `-a`  | repeatable | no       | operator key   | Admin key(s). Pass multiple times for KeyList / threshold admin keys   |
| `--admin-key-threshold`  | `-A`  | number     | no       | —              | M-of-N when multiple `--admin-key` values are set                      |
| `--supply-key`           | `-s`  | repeatable | no       | —              | Supply key(s). Pass multiple times for KeyList / threshold supply keys |
| `--supply-key-threshold` | `-L`  | number     | no       | —              | M-of-N when multiple `--supply-key` values are set                     |
| `--name`                 | `-n`  | string     | no       | —              | Local alias to register                                                |
| `--key-manager`          | `-k`  | string     | no       | config default | Key manager: `local` or `local_encrypted`                              |
| `--memo`                 | `-M`  | string     | no       | —              | Token memo (max 100 chars)                                             |
| `--batch`                | `-B`  | string     | no       | —              | Queue into a named batch instead of executing immediately              |

**Example:**

```
hcli token create-nft --token-name "MyNFT" --symbol MNFT --supply-key 0.0.123:302e... --name mynft
hcli token create-nft --token-name "MyNFT" --symbol MNFT --supply-key 0.0.123:302e... --batch myBatch
```

**Output:** `{ tokenId, name, symbol, transactionId }`

---

### `hcli token create-ft-from-file` [batchify]

Create a fungible token from a JSON definition file (supports advanced features).

| Option          | Short | Type   | Required | Default        | Description                                               |
| --------------- | ----- | ------ | -------- | -------------- | --------------------------------------------------------- |
| `--file`        | `-f`  | string | **yes**  | —              | Path to JSON token definition file (absolute or relative) |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                 |
| `--batch`       | `-B`  | string | no       | —              | Queue into a named batch instead of executing immediately |

**Example:**

```
hcli token create-ft-from-file --file ./my-token.json
hcli token create-ft-from-file --file ./my-token.json --batch myBatch
```

Optional JSON fields in the definition file: `autoRenewPeriod` (seconds or suffixed duration), `autoRenewAccount` (same formats as treasury/keys), `expirationTime` (ISO 8601). If `autoRenewPeriod` is set, `autoRenewAccount` is required; if both auto-renew fields are set, `expirationTime` is ignored (warning logged).

**Output:** Same shape as CLI `create-ft`, plus `associations[]`, including optional `autoRenewPeriodSeconds`, `autoRenewAccountId`, `expirationTime`.

---

### `hcli token create-nft-from-file` [batchify]

Create a non-fungible token from a JSON definition file (supports advanced features).

| Option          | Short | Type   | Required | Default        | Description                                               |
| --------------- | ----- | ------ | -------- | -------------- | --------------------------------------------------------- |
| `--file`        | `-f`  | string | **yes**  | —              | Path to JSON NFT definition file (absolute or relative)   |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                 |
| `--batch`       | `-B`  | string | no       | —              | Queue into a named batch instead of executing immediately |

**Example:**

```
hcli token create-nft-from-file --file ./my-nft.json
hcli token create-nft-from-file --file ./my-nft.json --batch myBatch
```

---

### `hcli token mint-ft` [batchify]

Mint additional fungible tokens to increase supply.

| Option          | Short | Type       | Required | Default        | Description                                                                                                                                             |
| --------------- | ----- | ---------- | -------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--token`       | `-T`  | string     | **yes**  | —              | Token alias or token ID                                                                                                                                 |
| `--amount`      | `-a`  | string     | **yes**  | —              | Amount to mint. Default: display units. Append `"t"` for raw units                                                                                      |
| `--supply-key`  | `-s`  | repeatable | no       | —              | Supply key(s). Omit if KMS can resolve all required on-chain supply public keys. Pass one or more times for explicit credentials or KeyList / threshold |
| `--key-manager` | `-k`  | string     | no       | config default | Key manager: `local` or `local_encrypted`                                                                                                               |
| `--batch`       | `-B`  | string     | no       | —              | Queue into a named batch instead of executing immediately                                                                                               |

**Example:**

```
hcli token mint-ft --token MTK --amount 50000 --supply-key 0.0.123:302e...
hcli token mint-ft --token MTK --amount 50000 --supply-key alice --supply-key bob
hcli token mint-ft --token MTK --amount 50000 --supply-key 0.0.123:302e... --batch myBatch
```

**Output:** `{ tokenId, mintedAmount, newTotalSupply, transactionId }`

---

### `hcli token mint-nft` [batchify]

Mint a new NFT into an existing NFT collection.

| Option          | Short | Type       | Required | Default        | Description                                                                                                                                             |
| --------------- | ----- | ---------- | -------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--token`       | `-T`  | string     | **yes**  | —              | Token alias or token ID                                                                                                                                 |
| `--metadata`    | `-m`  | string     | **yes**  | —              | NFT metadata string (max 100 bytes)                                                                                                                     |
| `--supply-key`  | `-s`  | repeatable | no       | —              | Supply key(s). Omit if KMS can resolve all required on-chain supply public keys. Pass one or more times for explicit credentials or KeyList / threshold |
| `--key-manager` | `-k`  | string     | no       | config default | Key manager: `local` or `local_encrypted`                                                                                                               |
| `--batch`       | `-B`  | string     | no       | —              | Queue into a named batch instead of executing immediately                                                                                               |

**Example:**

```
hcli token mint-nft --token mynft --metadata "ipfs://QmABC..." --supply-key 0.0.123:302e...
hcli token mint-nft --token mynft --metadata "ipfs://QmABC..." --supply-key alice --supply-key bob
hcli token mint-nft --token mynft --metadata "ipfs://QmABC..." --supply-key 0.0.123:302e... --batch myBatch
```

**Output:** `{ tokenId, serialNumber, transactionId }`

---

### `hcli token update-metadata-nft` [batchify]

Update metadata for existing NFT serial(s). Requires the token metadata key to sign ([Hedera docs](https://docs.hedera.com/hedera/sdks-and-apis/sdks/token-service/update-nft-metadata)).

| Option           | Short | Type       | Required | Default        | Description                                                                                                                         |
| ---------------- | ----- | ---------- | -------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `--token`        | `-T`  | string     | **yes**  | —              | NFT collection: token alias or token ID                                                                                             |
| `--serials`      | `-s`  | string     | **yes**  | —              | Comma-separated serial numbers (max 10)                                                                                             |
| `--metadata`     | `-m`  | string     | **yes**  | —              | New metadata (max 100 bytes)                                                                                                        |
| `--metadata-key` | `-M`  | repeatable | no       | —              | Metadata key(s). Omit if KMS can resolve all required on-chain metadata public keys. Pass one or more times for KeyList / threshold |
| `--key-manager`  | `-k`  | string     | no       | config default | Key manager: `local` or `local_encrypted`                                                                                           |
| `--batch`        | `-B`  | string     | no       | —              | Queue into a named batch instead of executing immediately                                                                           |

**Example:**

```
hcli token update-metadata-nft --token mynft --serials 1 --metadata "ipfs://QmNew..."
hcli token update-metadata-nft --token 0.0.456 --serials 1,2 --metadata "v2" --metadata-key alice --metadata-key bob
hcli token update-metadata-nft --token mynft --serials 1 --metadata "ipfs://..." --batch myBatch
```

**Output:** `{ transactionId, tokenId, serialNumbers[], network }`

---

### `hcli token transfer-ft` [batchify]

Transfer a fungible token from one account to another.

| Option          | Short | Type   | Required | Default        | Description                                                            |
| --------------- | ----- | ------ | -------- | -------------- | ---------------------------------------------------------------------- |
| `--token`       | `-T`  | string | **yes**  | —              | Token alias or token ID                                                |
| `--to`          | `-t`  | string | **yes**  | —              | Destination account ID or alias                                        |
| `--amount`      | `-a`  | string | **yes**  | —              | Amount to transfer. Default: display units. Append `"t"` for raw units |
| `--from`        | `-f`  | string | no       | operator       | Sender: `accountId:privateKey`, key reference, or alias                |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                              |
| `--batch`       | `-B`  | string | no       | —              | Queue into a named batch instead of executing immediately              |

**Example:**

```
hcli token transfer-ft --token MTK --to alice --amount 100
hcli token transfer-ft --token 0.0.456 --to 0.0.789 --amount 50 --from 0.0.123:302e...
hcli token transfer-ft --token MTK --to alice --amount 100 --batch myBatch
```

**Output:** `{ tokenId, from, to, amount, transactionId }`

---

### `hcli token transfer-nft` [batchify]

Transfer one or more NFTs from one account to another.

| Option          | Short | Type   | Required | Default        | Description                                               |
| --------------- | ----- | ------ | -------- | -------------- | --------------------------------------------------------- |
| `--token`       | `-T`  | string | **yes**  | —              | NFT token alias or token ID                               |
| `--to`          | `-t`  | string | **yes**  | —              | Destination account ID or alias                           |
| `--serials`     | `-s`  | string | **yes**  | —              | Comma-separated serial numbers, e.g. `"1,2,3"`            |
| `--from`        | `-f`  | string | no       | operator       | Sender: `accountId:privateKey`, key reference, or alias   |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                 |
| `--batch`       | `-B`  | string | no       | —              | Queue into a named batch instead of executing immediately |

**Example:**

```
hcli token transfer-nft --token mynft --to alice --serials "1,2"
hcli token transfer-nft --token mynft --to alice --serials "1,2" --batch myBatch
```

**Output:** `{ tokenId, from, to, serials[], transactionId }`

---

### `hcli token associate` [batchify]

Associate a token with an account to enable transfers to that account.

| Option          | Short | Type   | Required | Default        | Description                                                           |
| --------------- | ----- | ------ | -------- | -------------- | --------------------------------------------------------------------- |
| `--token`       | `-T`  | string | **yes**  | —              | Token alias or token ID                                               |
| `--account`     | `-a`  | string | **yes**  | —              | Account to associate: `accountId:privateKey`, key reference, or alias |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                             |
| `--batch`       | `-B`  | string | no       | —              | Queue into a named batch instead of executing immediately             |

**Example:**

```
hcli token associate --token MTK --account alice
hcli token associate --token 0.0.456 --account 0.0.789:302e...
hcli token associate --token MTK --account alice --batch myBatch
```

**Output:** `{ tokenId, accountId, transactionId }`

---

### `hcli token allowance-ft` [batchify]

Approve (or revoke) a spender allowance for fungible tokens on behalf of the owner.

| Option          | Short | Type   | Required | Default        | Description                                                                                |
| --------------- | ----- | ------ | -------- | -------------- | ------------------------------------------------------------------------------------------ |
| `--token`       | `-T`  | string | **yes**  | —              | Token alias or token ID                                                                    |
| `--owner`       | `-o`  | string | **yes**  | —              | Owner account: `accountId:privateKey`, key reference, or alias                             |
| `--spender`     | `-s`  | string | **yes**  | —              | Spender account: account ID or alias                                                       |
| `--amount`      | `-a`  | string | **yes**  | —              | Allowance amount. Default: display units. Append `"t"` for raw units. Set to `0` to revoke |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                                                  |
| `--batch`       | `-B`  | string | no       | —              | Queue into a named batch instead of executing immediately                                  |

**Example:**

```
hcli token allowance-ft --token MTK --owner alice --spender bob --amount 500
hcli token allowance-ft --token 0.0.456 --owner 0.0.123:302e... --spender 0.0.789 --amount 0
hcli token allowance-ft --token MTK --owner alice --spender bob --amount 500 --batch myBatch
```

**Output:** `{ tokenId, ownerAccountId, spenderAccountId, amount, transactionId, network }`

---

### `hcli token list`

List all tokens (FT and NFT) stored in local state across all networks.

| Option   | Short | Type    | Required | Default | Description                                               |
| -------- | ----- | ------- | -------- | ------- | --------------------------------------------------------- |
| `--keys` | `-k`  | boolean | no       | `false` | Include token key information (admin, supply, wipe, etc.) |

**Example:**

```
hcli token list
hcli token list --keys
```

**Output:** Array of `{ tokenId, name, symbol, type, decimals?, keys? }`

---

### `hcli token view`

View detailed information about a specific token or NFT instance.

| Option     | Short | Type   | Required | Default | Description                                      |
| ---------- | ----- | ------ | -------- | ------- | ------------------------------------------------ |
| `--token`  | `-T`  | string | **yes**  | —       | Token alias or token ID                          |
| `--serial` | `-S`  | string | no       | —       | Serial number of a specific NFT instance to view |

**Example:**

```
hcli token view --token MTK
hcli token view --token mynft --serial 3
```

**Output:** Token details including `{ tokenId, name, symbol, type, totalSupply, ... }` or NFT instance details

---

### `hcli token import`

Import an existing token from the Hedera network into local state.

| Option    | Short | Type   | Required | Default | Description                            |
| --------- | ----- | ------ | -------- | ------- | -------------------------------------- |
| `--token` | `-T`  | string | **yes**  | —       | Token ID to import (e.g. `0.0.123456`) |
| `--name`  | `-n`  | string | no       | —       | Local alias for the token              |

**Example:**

```
hcli token import --token 0.0.123456 --name importedToken
```

**Output:** `{ tokenId, name, symbol, type }`

---

### `hcli token delete`

Delete a token on Hedera (unless `--state-only`) and remove it from local CLI state. Admin keys are resolved from the key manager when on-chain public keys match stored credentials; otherwise pass `--admin-key` one or more times (KeyList / threshold).

| Option          | Short | Type       | Required | Default | Description                                                                                                 |
| --------------- | ----- | ---------- | -------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| `--token`       | `-T`  | string     | **yes**  | —       | Token alias or token ID                                                                                     |
| `--admin-key`   | `-a`  | repeatable | no       | —       | Admin credential(s) when not auto-resolved from KMS. Pass multiple times for KeyList / threshold admin keys |
| `--key-manager` | `-k`  | string     | no       | config  | Key manager when resolving `--admin-key`                                                                    |
| `--state-only`  | `-s`  | boolean    | no       | `false` | Only remove from local CLI state; no network delete (mutually exclusive with `--admin-key`)                 |

**Example:**

```
hcli token delete --token MTK
hcli token delete --token 0.0.123456 --admin-key alice --admin-key bob
hcli token delete --token MTK --state-only
```

**Output:** `{ deletedToken, transactionId?, network, removedAliases?, stateOnly }` (see `TokenDeleteOutputSchema`)
