# token plugin

Manage Hedera fungible tokens (FT) and non-fungible tokens (NFT): create/import/list/view/delete, mint/burn/wipe/transfer/airdrop, associate/dissociate, freeze/unfreeze, pause/unpause, KYC, allowances, and NFT metadata.

## Hook-compatible commands

Commands marked **`[batchify]`** support the `--batch <name>` flag to queue into a batch instead of executing immediately.

Commands marked **`[scheduled]`** support the `--scheduled <name>` / `-X <name>` flag to wrap the transaction in a schedule.

---

### `hcli token create-ft` `[batchify]` `[scheduled]`

Create a new fungible token with specified properties.

| Option                   | Short | Type       | Required | Default        | Description                                                                                                                                                 |
| ------------------------ | ----- | ---------- | -------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--token-name`           | `-T`  | string     | **yes**  | —              | Token name                                                                                                                                                  |
| `--symbol`               | `-C`  | string     | **yes**  | —              | Token symbol                                                                                                                                                |
| `--treasury`             | `-t`  | string     | no       | operator       | Treasury account: `accountId:privateKey`, key reference, or alias                                                                                           |
| `--decimals`             | `-d`  | number     | no       | `0`            | Number of decimal places                                                                                                                                    |
| `--initial-supply`       | `-i`  | string     | no       | `1000000`      | Initial supply. Default: display units. Append `"t"` for raw units                                                                                          |
| `--supply-type`          | `-S`  | string     | no       | `INFINITE`     | Supply type: `INFINITE` or `FINITE`                                                                                                                         |
| `--max-supply`           | `-m`  | string     | no       | —              | Max supply. Required when `supply-type=FINITE`; not allowed when `INFINITE`. Append `"t"` for raw units                                                     |
| `--admin-key`            | `-a`  | repeatable | no       | none           | Admin key(s). Omit for a token without an admin key. Pass multiple times for KeyList / threshold admin keys. Same credential formats as `hcli account` help |
| `--admin-key-threshold`  | `-A`  | number     | no       | —              | M-of-N for threshold admin keys (use when multiple `--admin-key` entries participate in an M-of-N policy)                                                   |
| `--supply-key`           | `-s`  | repeatable | no       | —              | Supply key(s). Pass multiple times for KeyList / threshold supply keys. Same formats as CLI key options                                                     |
| `--supply-key-threshold` | `-L`  | number     | no       | —              | M-of-N for threshold supply keys (use when multiple `--supply-key` entries participate in an M-of-N policy)                                                 |
| `--freeze-default`       | `-G`  | flag       | no       | `false`        | When set and a freeze key is provided, new token associations are frozen by default (presence-only flag)                                                    |
| `--name`                 | `-n`  | string     | no       | —              | Local alias to register for this token                                                                                                                      |
| `--key-manager`          | `-k`  | string     | no       | config default | Key manager: `local` or `local_encrypted`                                                                                                                   |
| `--memo`                 | `-o`  | string     | no       | —              | Token memo (max 100 chars)                                                                                                                                  |
| `--auto-renew-period`    | `-R`  | string     | no       | —              | Auto-renew interval: integer = seconds, or suffix `s` / `m` / `h` / `d`. Requires `--auto-renew-account`                                                    |
| `--auto-renew-account`   | `-r`  | string     | no       | —              | Account that pays auto-renewal (alias, `accountId:key`, key reference, etc.)                                                                                |
| `--expiration-time`      | `-x`  | string     | no       | —              | Fixed expiration (ISO 8601). Ignored (with warning) if auto-renew period + account are set                                                                  |
| `--batch`                | `-B`  | string     | no       | —              | Queue into a named batch instead of executing immediately                                                                                                   |
| `--scheduled`            | `-X`  | string     | no       | —              | Wrap as a scheduled transaction. Value is the local schedule record name                                                                                    |

**Example:**

```bash
hcli token create-ft --token-name "MyToken" --symbol MTK --decimals 2 --initial-supply 1000000 --name mytoken
hcli token create-ft --token-name "MyToken" --symbol MTK --batch myBatch
```

**Output:** `{ tokenId, name, symbol, treasuryId, decimals, initialSupply, supplyType, transactionId, alias?, network, autoRenewPeriodSeconds?, autoRenewAccountId?, expirationTime? }` — `expirationTime` is an ISO string when fixed expiration was used; lifecycle fields are omitted when not set.

**Repeatable keys:** Besides `--admin-key` / `--supply-key`, role options such as `--freeze-key`, `--wipe-key`, `--kyc-key`, `--pause-key`, `--fee-schedule-key`, and `--metadata-key` are repeatable; each has a matching `-*-threshold` flag for M-of-N policies. Short flags: `--freeze-key -f`, `--wipe-key -w`, `--kyc-key -y`, `--pause-key -p`, `--fee-schedule-key -e`, `--metadata-key -D` (thresholds `-Z`, `-W`, `-H`, `-U`, `-E`, `-O`). Use `hcli token create-ft --help` for the full list.

---

### `hcli token create-nft` `[batchify]` `[scheduled]`

Create a new non-fungible token collection.

| Option                    | Short | Type       | Required | Default        | Description                                                                                             |
| ------------------------- | ----- | ---------- | -------- | -------------- | ------------------------------------------------------------------------------------------------------- |
| `--token-name`            | `-T`  | string     | **yes**  | —              | Token name                                                                                              |
| `--symbol`                | `-C`  | string     | **yes**  | —              | Token symbol                                                                                            |
| `--treasury`              | `-t`  | string     | no       | operator       | Treasury account: `accountId:privateKey`, key reference, or alias                                       |
| `--supply-type`           | `-S`  | string     | no       | `INFINITE`     | Supply type: `INFINITE` or `FINITE`                                                                     |
| `--max-supply`            | `-m`  | string     | no       | —              | Max supply. Required when `supply-type=FINITE`; not allowed when `INFINITE`. Append `"t"` for raw units |
| `--admin-key`             | `-a`  | repeatable | no       | operator key   | Admin key(s). Pass multiple times for KeyList / threshold admin keys                                    |
| `--admin-key-threshold`   | `-A`  | number     | no       | —              | M-of-N when multiple `--admin-key` values are set                                                       |
| `--supply-key`            | `-s`  | repeatable | **yes**  | —              | Supply key(s). Pass multiple times for KeyList / threshold supply keys                                  |
| `--supply-key-threshold`  | `-L`  | number     | no       | —              | M-of-N when multiple `--supply-key` values are set                                                      |
| `--freeze-default`        | `-G`  | flag       | no       | `false`        | When set, new token associations are frozen by default. Requires `--freeze-key` (error otherwise)       |
| `--auto-renew-period`     | `-R`  | number     | no       | —              | Auto-renew period in seconds (e.g. `7776000` for 90 days)                                               |
| `--auto-renew-account-id` | `-r`  | string     | no       | —              | Account ID that pays for token auto-renewal fees (e.g. `0.0.12345`)                                     |
| `--expiration-time`       | `-x`  | string     | no       | —              | Token expiration time in ISO 8601 format (e.g. `2027-01-01T00:00:00Z`)                                  |
| `--name`                  | `-n`  | string     | no       | —              | Local alias to register                                                                                 |
| `--key-manager`           | `-k`  | string     | no       | config default | Key manager: `local` or `local_encrypted`                                                               |
| `--memo`                  | `-o`  | string     | no       | —              | Token memo (max 100 chars)                                                                              |
| `--batch`                 | `-B`  | string     | no       | —              | Queue into a named batch instead of executing immediately                                               |
| `--scheduled`             | `-X`  | string     | no       | —              | Wrap as a scheduled transaction. Value is the local schedule record name                                |

> **Note:** `create-nft` exposes `--auto-renew-account-id` (long flag) whereas `create-ft` uses `--auto-renew-account`. Both target the same Hedera concept; mind the difference when copying examples between commands.

**Repeatable role keys:** `--freeze-key -f`, `--wipe-key -w`, `--kyc-key -y`, `--pause-key -p`, `--fee-schedule-key -e`, `--metadata-key -D`, each with a matching `-*-threshold` flag (`-Z`, `-W`, `-H`, `-U`, `-E`, `-O`). Run `hcli token create-nft --help` for the full list.

**Example:**

```bash
hcli token create-nft --token-name "MyNFT" --symbol MNFT --supply-key 0.0.123:302e... --name mynft
hcli token create-nft --token-name "MyNFT" --symbol MNFT --supply-key 0.0.123:302e... --batch myBatch
```

**Output:** `{ tokenId, name, symbol, treasuryId, supplyType, transactionId, adminAccountId?, adminPublicKey?, supplyAccountId?, supplyPublicKey?, freezePublicKey?, wipePublicKey?, pausePublicKey?, kycPublicKey?, feeSchedulePublicKey?, metadataPublicKey?, alias?, network }`

---

### `hcli token create-ft-from-file` `[batchify]` `[scheduled]`

Create a fungible token from a JSON definition file (supports advanced features).

| Option          | Short | Type   | Required | Default        | Description                                                              |
| --------------- | ----- | ------ | -------- | -------------- | ------------------------------------------------------------------------ |
| `--file`        | `-f`  | string | **yes**  | —              | Path to JSON token definition file (absolute or relative)                |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                                |
| `--batch`       | `-B`  | string | no       | —              | Queue into a named batch instead of executing immediately                |
| `--scheduled`   | `-X`  | string | no       | —              | Wrap as a scheduled transaction. Value is the local schedule record name |

**Example:**

```bash
hcli token create-ft-from-file --file ./my-token.json
hcli token create-ft-from-file --file ./my-token.json --batch myBatch
```

Required JSON fields: `name` (local CLI alias), `tokenName` (on-chain token name), `symbol`, `decimals`, `supplyType` (`finite` or `infinite`), `initialSupply`, `treasuryKey`. `maxSupply` is required when `supplyType` is `finite` and must not be set when `infinite`.

Optional JSON fields in the definition file: `freezeDefault` (boolean, default `false`), `customFees` (max 10 entries; `fixed` or `fractional`, see `examples/token/token-fixed-fee-*.json` and `token-fractional-fee-*.json`), `autoRenewPeriod` (seconds or suffixed duration), `autoRenewAccount` (same formats as treasury/keys), `expirationTime` (ISO 8601). If `autoRenewPeriod` is set, `autoRenewAccount` is required; if both auto-renew fields are set, `expirationTime` is ignored (warning logged).

Minimal JSON:

```json
{
  "name": "my-token",
  "tokenName": "My Token",
  "symbol": "MTK",
  "decimals": 8,
  "supplyType": "finite",
  "initialSupply": "1000000",
  "maxSupply": "10000000",
  "treasuryKey": "alice",
  "adminKey": "alice",
  "supplyKey": "alice",
  "memo": "Optional token memo",
  "associations": ["bob"]
}
```

Common key fields: `treasuryKey`, `adminKey`, `supplyKey`, `wipeKey`, `kycKey`, `freezeKey`, `pauseKey`, `feeScheduleKey`, `metadataKey`. Each role key accepts a single credential string **or an array of strings** for KeyList / ThresholdKey support. Each role also has an optional `*KeyThreshold` field (`adminKeyThreshold`, `supplyKeyThreshold`, etc.) for M-of-N signing — omit to require all keys. Key values accept the same formats as CLI key options: alias, `accountId:privateKey`, `{ed25519|ecdsa}:private:{hex}`, `{ed25519|ecdsa}:public:{hex}`, or `kr_xxx`.

Threshold example:

```json
{
  "adminKey": ["alice", "bob"],
  "adminKeyThreshold": 1,
  "wipeKey": ["alice", "bob", "carol"],
  "wipeKeyThreshold": 2
}
```

**Output:** Same shape as CLI `create-ft`, plus `associations[]`, including optional `autoRenewPeriodSeconds`, `autoRenewAccountId`, `expirationTime`.

---

### `hcli token create-nft-from-file` `[batchify]` `[scheduled]`

Create a non-fungible token from a JSON definition file (supports advanced features).

| Option          | Short | Type   | Required | Default        | Description                                                              |
| --------------- | ----- | ------ | -------- | -------------- | ------------------------------------------------------------------------ |
| `--file`        | `-f`  | string | **yes**  | —              | Path to JSON NFT definition file (absolute or relative)                  |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                                |
| `--batch`       | `-B`  | string | no       | —              | Queue into a named batch instead of executing immediately                |
| `--scheduled`   | `-X`  | string | no       | —              | Wrap as a scheduled transaction. Value is the local schedule record name |

**Example:**

```bash
hcli token create-nft-from-file --file ./my-nft.json
hcli token create-nft-from-file --file ./my-nft.json --batch myBatch
```

Minimal JSON:

```json
{
  "name": "my-nft",
  "tokenName": "My NFT",
  "symbol": "MNFT",
  "supplyType": "finite",
  "maxSupply": 1000,
  "treasuryKey": "alice",
  "adminKey": "alice",
  "supplyKey": "alice",
  "memo": "Optional NFT collection memo",
  "associations": ["bob"]
}
```

NFT files do not use `decimals`, `initialSupply`, `freezeDefault`, `customFees`, `metadataKey`, or auto-renew / expiration fields. `adminKey` and `supplyKey` are required (at least one key each); optional keys are `wipeKey`, `kycKey`, `freezeKey`, `pauseKey`, `feeScheduleKey`, each accepting a string or array plus a `*KeyThreshold` field. Required fields: `name`, `tokenName`, `symbol`, `supplyType`, `treasuryKey`; `maxSupply` is required when `supplyType` is `finite` and must not be set when `infinite`.

**Output:** `{ tokenId, name, symbol, treasuryId, adminAccountId?, adminPublicKey, supplyAccountId?, supplyPublicKey, supplyType, transactionId, alias?, network, associations[] }`

---

### `hcli token mint-ft` `[batchify]` `[scheduled]`

Mint additional fungible tokens to increase supply.

| Option          | Short | Type       | Required | Default        | Description                                                                                                                                             |
| --------------- | ----- | ---------- | -------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--token`       | `-T`  | string     | **yes**  | —              | Token alias or token ID                                                                                                                                 |
| `--amount`      | `-a`  | string     | **yes**  | —              | Amount to mint. Default: display units. Append `"t"` for raw units                                                                                      |
| `--supply-key`  | `-s`  | repeatable | no       | —              | Supply key credential(s). Omit to auto-resolve from KMS when on-chain public keys match stored credentials. Pass multiple times for KeyList / threshold |
| `--key-manager` | `-k`  | string     | no       | config default | Key manager: `local` or `local_encrypted`                                                                                                               |
| `--batch`       | `-B`  | string     | no       | —              | Queue into a named batch instead of executing immediately                                                                                               |
| `--scheduled`   | `-X`  | string     | no       | —              | Wrap as a scheduled transaction. Value is the local schedule record name                                                                                |

**Example:**

```bash
hcli token mint-ft --token MTK --amount 50000 --supply-key 0.0.123:302e...
hcli token mint-ft --token MTK --amount 50000 --supply-key alice
hcli token mint-ft --token MTK --amount 50000 --supply-key 0.0.123:302e... --batch myBatch
```

**Output:** `{ transactionId, tokenId, amount, network }` (`amount` in base units)

---

### `hcli token mint-nft` `[batchify]` `[scheduled]`

Mint a new NFT into an existing NFT collection.

| Option          | Short | Type       | Required | Default        | Description                                                                                                                                             |
| --------------- | ----- | ---------- | -------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--token`       | `-T`  | string     | **yes**  | —              | Token alias or token ID                                                                                                                                 |
| `--metadata`    | `-m`  | string     | **yes**  | —              | NFT metadata string (max 100 bytes)                                                                                                                     |
| `--supply-key`  | `-s`  | repeatable | no       | —              | Supply key credential(s). Omit to auto-resolve from KMS when on-chain public keys match stored credentials. Pass multiple times for KeyList / threshold |
| `--key-manager` | `-k`  | string     | no       | config default | Key manager: `local` or `local_encrypted`                                                                                                               |
| `--batch`       | `-B`  | string     | no       | —              | Queue into a named batch instead of executing immediately                                                                                               |
| `--scheduled`   | `-X`  | string     | no       | —              | Wrap as a scheduled transaction. Value is the local schedule record name                                                                                |

**Example:**

```bash
hcli token mint-nft --token mynft --metadata "ipfs://QmABC..." --supply-key 0.0.123:302e...
hcli token mint-nft --token mynft --metadata "ipfs://QmABC..." --supply-key alice
hcli token mint-nft --token mynft --metadata "ipfs://QmABC..." --supply-key 0.0.123:302e... --batch myBatch
```

**Output:** `{ transactionId, tokenId, serialNumber, network }`

---

### `hcli token update-metadata-nft` `[batchify]` `[scheduled]`

Update metadata for existing NFT serial(s). Requires the token metadata key to sign ([Hedera docs](https://docs.hedera.com/hedera/sdks-and-apis/sdks/token-service/update-nft-metadata)).

| Option           | Short | Type       | Required | Default        | Description                                                                                                                         |
| ---------------- | ----- | ---------- | -------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `--token`        | `-T`  | string     | **yes**  | —              | NFT collection: token alias or token ID                                                                                             |
| `--serials`      | `-s`  | string     | **yes**  | —              | Comma-separated serial numbers (max 10)                                                                                             |
| `--metadata`     | `-m`  | string     | **yes**  | —              | New metadata (max 100 bytes)                                                                                                        |
| `--metadata-key` | `-D`  | repeatable | no       | —              | Metadata key(s). Omit if KMS can resolve all required on-chain metadata public keys. Pass one or more times for KeyList / threshold |
| `--key-manager`  | `-k`  | string     | no       | config default | Key manager: `local` or `local_encrypted`                                                                                           |
| `--batch`        | `-B`  | string     | no       | —              | Queue into a named batch instead of executing immediately                                                                           |
| `--scheduled`    | `-X`  | string     | no       | —              | Wrap as a scheduled transaction. Value is the local schedule record name                                                            |

**Example:**

```bash
hcli token update-metadata-nft --token mynft --serials 1 --metadata "ipfs://QmNew..."
hcli token update-metadata-nft --token 0.0.456 --serials 1,2 --metadata "v2" --metadata-key alice --metadata-key bob
hcli token update-metadata-nft --token mynft --serials 1 --metadata "ipfs://..." --batch myBatch
hcli token update-metadata-nft --token mynft --serials 1 --metadata "ipfs://..." --scheduled mySchedule
```

**Output:** `{ transactionId, tokenId, serialNumbers[], network }`

---

### `hcli token transfer-ft` `[batchify]` `[scheduled]`

Transfer a fungible token from one account to another.

| Option          | Short | Type   | Required | Default        | Description                                                              |
| --------------- | ----- | ------ | -------- | -------------- | ------------------------------------------------------------------------ |
| `--token`       | `-T`  | string | **yes**  | —              | Token alias or token ID                                                  |
| `--to`          | `-t`  | string | **yes**  | —              | Destination account ID or alias                                          |
| `--amount`      | `-a`  | string | **yes**  | —              | Amount to transfer. Default: display units. Append `"t"` for raw units   |
| `--from`        | `-f`  | string | no       | operator       | Sender: `accountId:privateKey`, key reference, or alias                  |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                                |
| `--batch`       | `-B`  | string | no       | —              | Queue into a named batch instead of executing immediately                |
| `--scheduled`   | `-X`  | string | no       | —              | Wrap as a scheduled transaction. Value is the local schedule record name |

**Example:**

```bash
hcli token transfer-ft --token MTK --to alice --amount 100
hcli token transfer-ft --token 0.0.456 --to 0.0.789 --amount 50 --from 0.0.123:302e...
hcli token transfer-ft --token MTK --to alice --amount 100 --batch myBatch
```

**Output:** `{ transactionId, tokenId, from, to, amount, network }`

---

### `hcli token transfer-nft` `[batchify]` `[scheduled]`

Transfer one or more NFTs from one account to another.

| Option          | Short | Type   | Required | Default        | Description                                                              |
| --------------- | ----- | ------ | -------- | -------------- | ------------------------------------------------------------------------ |
| `--token`       | `-T`  | string | **yes**  | —              | NFT token alias or token ID                                              |
| `--to`          | `-t`  | string | **yes**  | —              | Destination account ID or alias                                          |
| `--serials`     | `-s`  | string | **yes**  | —              | Comma-separated serial numbers, e.g. `"1,2,3"`                           |
| `--from`        | `-f`  | string | no       | operator       | Sender: `accountId:privateKey`, key reference, or alias                  |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                                |
| `--batch`       | `-B`  | string | no       | —              | Queue into a named batch instead of executing immediately                |
| `--scheduled`   | `-X`  | string | no       | —              | Wrap as a scheduled transaction. Value is the local schedule record name |

**Example:**

```bash
hcli token transfer-nft --token mynft --to alice --serials "1,2"
hcli token transfer-nft --token mynft --to alice --serials "1,2" --batch myBatch
```

**Output:** `{ transactionId, tokenId, from, to, serials[], network }`

---

### `hcli token associate` `[batchify]` `[scheduled]`

Associate a token with an account to enable transfers to that account.

| Option          | Short | Type   | Required | Default        | Description                                                              |
| --------------- | ----- | ------ | -------- | -------------- | ------------------------------------------------------------------------ |
| `--token`       | `-T`  | string | **yes**  | —              | Token alias or token ID                                                  |
| `--account`     | `-a`  | string | **yes**  | —              | Account to associate: `accountId:privateKey`, key reference, or alias    |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                                |
| `--batch`       | `-B`  | string | no       | —              | Queue into a named batch instead of executing immediately                |
| `--scheduled`   | `-X`  | string | no       | —              | Wrap as a scheduled transaction. Value is the local schedule record name |

**Example:**

```bash
hcli token associate --token MTK --account alice
hcli token associate --token 0.0.456 --account 0.0.789:302e...
hcli token associate --token MTK --account alice --batch myBatch
```

**Output:** `{ transactionId, accountId, tokenId, network }`

---

### `hcli token allowance-ft` `[batchify]`

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

```bash
hcli token allowance-ft --token MTK --owner alice --spender bob --amount 500
hcli token allowance-ft --token 0.0.456 --owner 0.0.123:302e... --spender 0.0.789 --amount 0
hcli token allowance-ft --token MTK --owner alice --spender bob --amount 500 --batch myBatch
```

**Output:** `{ tokenId, ownerAccountId, spenderAccountId, amount, transactionId, network }`

---

### `hcli token allowance-ft-list`

List fungible token allowances granted by an owner account (Mirror Node data).

| Option       | Short | Type    | Required | Default | Description                                 |
| ------------ | ----- | ------- | -------- | ------- | ------------------------------------------- |
| `--account`  | `-a`  | string  | **yes**  | —       | Owner account ID or alias to query          |
| `--token`    | `-T`  | string  | no       | —       | Optional token ID or alias filter           |
| `--spender`  | `-s`  | string  | no       | —       | Optional spender account ID or alias filter |
| `--show-all` |       | boolean | no       | `false` | Fetch all pages instead of the first page   |
| `--raw`      |       | boolean | no       | `false` | Skip token metadata enrichment              |

**Example:**

```bash
hcli token allowance-ft-list --account alice
hcli token allowance-ft-list --account alice --token MTK --spender bob --show-all
```

**Output:** `{ accountId, network, raw, allowances[{ tokenId, tokenName?, tokenSymbol?, decimals?, spenderAccountId, amount, amountDisplay? }], total, hasMore }`

---

### `hcli token allowance-nft-list`

List NFT allowances granted by an owner account (Mirror Node data).

| Option       | Short | Type    | Required | Default | Description                                 |
| ------------ | ----- | ------- | -------- | ------- | ------------------------------------------- |
| `--account`  | `-a`  | string  | **yes**  | —       | Owner account ID or alias to query          |
| `--token`    | `-T`  | string  | no       | —       | Optional NFT token ID or alias filter       |
| `--spender`  | `-s`  | string  | no       | —       | Optional spender account ID or alias filter |
| `--show-all` |       | boolean | no       | `false` | Fetch all pages instead of the first page   |
| `--raw`      |       | boolean | no       | `false` | Skip token metadata enrichment              |

**Example:**

```bash
hcli token allowance-nft-list --account alice
hcli token allowance-nft-list --account alice --token mynft --spender bob
```

**Output:** `{ accountId, network, raw, allowances[{ tokenId, tokenName?, tokenSymbol?, spenderAccountId, approvedForAll, serialNumbers[] }], total, hasMore }`

---

### `hcli token list`

List all tokens (FT and NFT) stored in local state across all networks.

| Option   | Short | Type    | Required | Default | Description                                               |
| -------- | ----- | ------- | -------- | ------- | --------------------------------------------------------- |
| `--keys` | `-k`  | boolean | no       | `false` | Include token key information (admin, supply, wipe, etc.) |

**Example:**

```bash
hcli token list
hcli token list --keys
```

**Output:** `{ tokens[{ tokenId, name, symbol, decimals, supplyType, tokenType, treasuryId, network, alias?, maxSupply, keys? }], totalCount, stats? }`

---

### `hcli token view`

View detailed information about a specific token or NFT instance.

| Option     | Short | Type   | Required | Default | Description                                      |
| ---------- | ----- | ------ | -------- | ------- | ------------------------------------------------ |
| `--token`  | `-T`  | string | **yes**  | —       | Token alias or token ID                          |
| `--serial` | `-S`  | string | no       | —       | Serial number of a specific NFT instance to view |

**Example:**

```bash
hcli token view --token MTK
hcli token view --token mynft --serial 3
```

**Output:** `{ tokenId, name, symbol, type, network, totalSupply, maxSupply, supplyType, decimals?, treasury?, memo?, createdTimestamp?, freezeDefault, autoRenewPeriodSeconds?, autoRenewAccountId?, expirationTime?, adminKey?, supplyKey?, nftSerial? }` — `nftSerial` (`{ serialNumber, owner, metadata?, metadataRaw?, createdTimestamp?, deleted }`) is present when `--serial` is given

---

### `hcli token import`

Import an existing token from the Hedera network into local state.

| Option    | Short | Type   | Required | Default | Description                            |
| --------- | ----- | ------ | -------- | ------- | -------------------------------------- |
| `--token` | `-T`  | string | **yes**  | —       | Token ID to import (e.g. `0.0.123456`) |
| `--name`  | `-n`  | string | no       | —       | Local alias for the token              |

**Example:**

```bash
hcli token import --token 0.0.123456 --name importedToken
```

**Output:** `{ tokenId, name, symbol, type, network, memo?, adminKeyPresent, supplyKeyPresent, alias? }`

---

### `hcli token update` `[batchify]`

Update properties of an existing token (verifies the token exists on the mirror node). At least one field to update must be provided. Current admin keys are auto-resolved from the key manager when `--admin-keys` is omitted. Key options accept `null` to permanently remove that key.

| Option                         | Short | Type       | Required | Default        | Description                                                                                |
| ------------------------------ | ----- | ---------- | -------- | -------------- | ------------------------------------------------------------------------------------------ |
| `--token`                      | `-T`  | string     | **yes**  | —              | Token ID or alias to update                                                                |
| `--token-name`                 | `-b`  | string     | no       | —              | New token name                                                                             |
| `--symbol`                     | `-C`  | string     | no       | —              | New token symbol                                                                           |
| `--treasury`                   | `-t`  | string     | no       | —              | New treasury account ID or alias                                                           |
| `--current-treasury-key`       | `-c`  | string     | no       | —              | Signing key for the new treasury account. Omit to auto-resolve from key manager            |
| `--admin-keys`                 | `-a`  | repeatable | no       | —              | Current admin key credential(s) for signing. Omit to auto-resolve from key manager         |
| `--admin-key-threshold`        | `-A`  | number     | no       | —              | How many current admin keys to use for signing (M-of-N). Only with multiple `--admin-keys` |
| `--new-admin-keys`             | `-n`  | repeatable | no       | —              | New admin key(s) replacing the current admin key. Pass `"null"` to clear                   |
| `--new-admin-key-threshold`    | `-K`  | number     | no       | —              | M-of-N for multiple `--new-admin-keys`                                                     |
| `--kyc-key`                    | `-y`  | repeatable | no       | —              | New KYC key(s). `"null"` removes the key                                                   |
| `--kyc-key-threshold`          | `-H`  | number     | no       | —              | M-of-N for KYC keys                                                                        |
| `--freeze-key`                 | `-f`  | repeatable | no       | —              | New freeze key(s). `"null"` removes the key                                                |
| `--freeze-key-threshold`       | `-Z`  | number     | no       | —              | M-of-N for freeze keys                                                                     |
| `--wipe-key`                   | `-w`  | repeatable | no       | —              | New wipe key(s). `"null"` removes the key                                                  |
| `--wipe-key-threshold`         | `-W`  | number     | no       | —              | M-of-N for wipe keys                                                                       |
| `--supply-key`                 | `-s`  | repeatable | no       | —              | New supply key(s). `"null"` removes the key                                                |
| `--supply-key-threshold`       | `-L`  | number     | no       | —              | M-of-N for supply keys                                                                     |
| `--fee-schedule-key`           | `-e`  | repeatable | no       | —              | New fee schedule key(s). `"null"` removes the key                                          |
| `--fee-schedule-key-threshold` | `-E`  | number     | no       | —              | M-of-N for fee schedule keys                                                               |
| `--pause-key`                  | `-p`  | repeatable | no       | —              | New pause key(s). `"null"` removes the key                                                 |
| `--pause-key-threshold`        | `-U`  | number     | no       | —              | M-of-N for pause keys                                                                      |
| `--metadata-key`               | `-D`  | repeatable | no       | —              | New metadata key(s). `"null"` removes the key                                              |
| `--metadata-key-threshold`     | `-O`  | number     | no       | —              | M-of-N for metadata keys                                                                   |
| `--memo`                       | `-o`  | string     | no       | —              | New memo. Pass `"null"` to clear                                                           |
| `--auto-renew-account`         | `-r`  | string     | no       | —              | New auto-renew account ID or alias                                                         |
| `--auto-renew-period`          | `-R`  | string     | no       | —              | New auto-renew period: integer seconds (30-92 days) or suffix `s` / `m` / `h` / `d`        |
| `--expiration-time`            | `-x`  | string     | no       | —              | New expiration time (ISO 8601). Can be set without admin key when it is the only change    |
| `--metadata`                   | `-d`  | string     | no       | —              | Token metadata (UTF-8 string, max 100 bytes)                                               |
| `--key-manager`                | `-k`  | string     | no       | config default | Key manager: `local` or `local_encrypted`                                                  |
| `--batch`                      | `-B`  | string     | no       | —              | Queue into a named batch instead of executing immediately                                  |

**Example:**

```bash
hcli token update --token MTK --token-name "New Name" --memo "updated"
hcli token update --token MTK --supply-key null
hcli token update --token MTK --new-admin-keys alice --new-admin-keys bob --new-admin-key-threshold 1
hcli token update --token MTK --symbol NEW --batch myBatch
```

**Output:** `{ tokenId, network, transactionId, updatedFields[] }`

---

### `hcli token delete` `[batchify]`

Delete a token on Hedera (unless `--state-only`) and remove it from local CLI state. Admin keys are resolved from the key manager when on-chain public keys match stored credentials; otherwise pass `--admin-key` one or more times (KeyList / threshold).

| Option          | Short | Type       | Required | Default | Description                                                                                                 |
| --------------- | ----- | ---------- | -------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| `--token`       | `-T`  | string     | **yes**  | —       | Token alias or token ID                                                                                     |
| `--admin-key`   | `-a`  | repeatable | no       | —       | Admin credential(s) when not auto-resolved from KMS. Pass multiple times for KeyList / threshold admin keys |
| `--key-manager` | `-k`  | string     | no       | config  | Key manager when resolving `--admin-key`                                                                    |
| `--state-only`  | `-s`  | boolean    | no       | `false` | Only remove from local CLI state; no network delete (mutually exclusive with `--admin-key`)                 |
| `--batch`       | `-B`  | string     | no       | —       | Queue into a named batch instead of executing immediately                                                   |

**Example:**

```bash
hcli token delete --token MTK
hcli token delete --token 0.0.123456 --admin-key alice --admin-key bob
hcli token delete --token MTK --state-only
hcli token delete --token MTK --batch myBatch
```

**Output:** `{ deletedToken{ name, tokenId }, transactionId?, removedAliases?, network }` (see `TokenDeleteOutputSchema`). `transactionId` is absent with `--state-only`.

---

### `hcli token burn-ft` `[batchify]` `[scheduled]`

Burn fungible tokens from the treasury account to decrease the total supply. Supply key required.

| Option          | Short | Type       | Required | Default        | Description                                                              |
| --------------- | ----- | ---------- | -------- | -------------- | ------------------------------------------------------------------------ |
| `--token`       | `-T`  | string     | **yes**  | —              | Token alias or token ID                                                  |
| `--amount`      | `-a`  | string     | **yes**  | —              | Amount to burn. Default: display units. Append `"t"` for raw units       |
| `--supply-key`  | `-s`  | repeatable | **yes**  | —              | Supply key credential(s). Pass multiple times for KeyList / threshold    |
| `--key-manager` | `-k`  | string     | no       | config default | Key manager: `local` or `local_encrypted`                                |
| `--batch`       | `-B`  | string     | no       | —              | Queue into a named batch instead of executing immediately                |
| `--scheduled`   | `-X`  | string     | no       | —              | Wrap as a scheduled transaction. Value is the local schedule record name |

**Example:**

```bash
hcli token burn-ft --token MTK --amount 5000 --supply-key alice
hcli token burn-ft --token MTK --amount 5000 --supply-key 0.0.123:302e...
hcli token burn-ft --token MTK --amount 5000 --supply-key alice --batch myBatch
```

**Output:** `{ transactionId, tokenId, amount, newTotalSupply, network }`

---

### `hcli token burn-nft` `[batchify]` `[scheduled]`

Burn one or more NFT serials to remove them from the collection. Supply key required.

| Option          | Short | Type       | Required | Default        | Description                                                              |
| --------------- | ----- | ---------- | -------- | -------------- | ------------------------------------------------------------------------ |
| `--token`       | `-T`  | string     | **yes**  | —              | Token alias or token ID                                                  |
| `--serials`     | `-s`  | string     | **yes**  | —              | Comma-separated serial numbers to burn (max 10)                          |
| `--supply-key`  | `-S`  | repeatable | **yes**  | —              | Supply key credential(s). Pass multiple times for KeyList / threshold    |
| `--key-manager` | `-k`  | string     | no       | config default | Key manager: `local` or `local_encrypted`                                |
| `--batch`       | `-B`  | string     | no       | —              | Queue into a named batch instead of executing immediately                |
| `--scheduled`   | `-X`  | string     | no       | —              | Wrap as a scheduled transaction. Value is the local schedule record name |

**Example:**

```bash
hcli token burn-nft --token mynft --serials "1,2,3" --supply-key alice
hcli token burn-nft --token mynft --serials 5 --supply-key 0.0.123:302e...
hcli token burn-nft --token mynft --serials "1,2" --supply-key alice --batch myBatch
```

**Output:** `{ transactionId, tokenId, serialNumbers[], newTotalSupply, network }`

---

### `hcli token wipe-ft` `[batchify]` `[scheduled]`

Wipe fungible tokens from a specific account's balance. Wipe key required (resolved from KMS when omitted).

| Option          | Short | Type       | Required | Default        | Description                                                                                               |
| --------------- | ----- | ---------- | -------- | -------------- | --------------------------------------------------------------------------------------------------------- |
| `--token`       | `-T`  | string     | **yes**  | —              | Token alias or token ID                                                                                   |
| `--account`     | `-a`  | string     | **yes**  | —              | Account to wipe from (ID, alias, or EVM address)                                                          |
| `--amount`      | `-m`  | string     | **yes**  | —              | Amount to wipe. Default: display units. Append `"t"` for raw units                                        |
| `--wipe-key`    | `-w`  | repeatable | no       | —              | Wipe key credential(s). Omit to auto-resolve from KMS when on-chain public key matches stored credentials |
| `--key-manager` | `-k`  | string     | no       | config default | Key manager: `local` or `local_encrypted`                                                                 |
| `--batch`       | `-B`  | string     | no       | —              | Queue into a named batch instead of executing immediately                                                 |
| `--scheduled`   | `-X`  | string     | no       | —              | Wrap as a scheduled transaction. Value is the local schedule record name                                  |

**Example:**

```bash
hcli token wipe-ft --token MTK --account alice --amount 100
hcli token wipe-ft --token 0.0.456 --account 0.0.789 --amount 50 --wipe-key 0.0.123:302e...
hcli token wipe-ft --token MTK --account alice --amount 100 --batch myBatch
```

**Output:** `{ transactionId, tokenId, accountId, amount, newTotalSupply, network }`

---

### `hcli token wipe-nft` `[batchify]` `[scheduled]`

Wipe one or more NFT serials from a specific account. Wipe key required (resolved from KMS when omitted).

| Option          | Short | Type       | Required | Default        | Description                                                                                               |
| --------------- | ----- | ---------- | -------- | -------------- | --------------------------------------------------------------------------------------------------------- |
| `--token`       | `-T`  | string     | **yes**  | —              | Token alias or token ID                                                                                   |
| `--account`     | `-a`  | string     | **yes**  | —              | Account to wipe from (ID, alias, or EVM address)                                                          |
| `--serials`     | `-s`  | string     | **yes**  | —              | Comma-separated serial numbers to wipe (max 10)                                                           |
| `--wipe-key`    | `-w`  | repeatable | no       | —              | Wipe key credential(s). Omit to auto-resolve from KMS when on-chain public key matches stored credentials |
| `--key-manager` | `-k`  | string     | no       | config default | Key manager: `local` or `local_encrypted`                                                                 |
| `--batch`       | `-B`  | string     | no       | —              | Queue into a named batch instead of executing immediately                                                 |
| `--scheduled`   | `-X`  | string     | no       | —              | Wrap as a scheduled transaction. Value is the local schedule record name                                  |

**Example:**

```bash
hcli token wipe-nft --token mynft --account alice --serials "1,2"
hcli token wipe-nft --token mynft --account alice --serials "1,2" --batch myBatch
```

**Output:** `{ transactionId, tokenId, accountId, serialNumbers[], newTotalSupply, network }`

---

### `hcli token freeze` `[batchify]` `[scheduled]`

Freeze a token on a specific account, preventing transfers. Freeze key required (resolved from KMS when omitted).

| Option          | Short | Type       | Required | Default        | Description                                                                                                 |
| --------------- | ----- | ---------- | -------- | -------------- | ----------------------------------------------------------------------------------------------------------- |
| `--token`       | `-T`  | string     | **yes**  | —              | Token alias or token ID                                                                                     |
| `--account`     | `-a`  | string     | **yes**  | —              | Account to freeze (ID, alias, or EVM address)                                                               |
| `--freeze-key`  | `-f`  | repeatable | no       | —              | Freeze key credential(s). Omit to auto-resolve from KMS when on-chain public key matches stored credentials |
| `--key-manager` | `-k`  | string     | no       | config default | Key manager: `local` or `local_encrypted`                                                                   |
| `--batch`       | `-B`  | string     | no       | —              | Queue into a named batch instead of executing immediately                                                   |
| `--scheduled`   | `-X`  | string     | no       | —              | Wrap as a scheduled transaction. Value is the local schedule record name                                    |

**Example:**

```bash
hcli token freeze --token MTK --account alice --freeze-key alice
hcli token freeze --token MTK --account alice --freeze-key alice --batch myBatch
```

**Output:** `{ transactionId, tokenId, accountId, network }`

---

### `hcli token unfreeze` `[batchify]` `[scheduled]`

Unfreeze a token on a specific account, re-enabling transfers. Freeze key required (resolved from KMS when omitted).

| Option          | Short | Type       | Required | Default        | Description                                                                                                 |
| --------------- | ----- | ---------- | -------- | -------------- | ----------------------------------------------------------------------------------------------------------- |
| `--token`       | `-T`  | string     | **yes**  | —              | Token alias or token ID                                                                                     |
| `--account`     | `-a`  | string     | **yes**  | —              | Account to unfreeze (ID, alias, or EVM address)                                                             |
| `--freeze-key`  | `-f`  | repeatable | no       | —              | Freeze key credential(s). Omit to auto-resolve from KMS when on-chain public key matches stored credentials |
| `--key-manager` | `-k`  | string     | no       | config default | Key manager: `local` or `local_encrypted`                                                                   |
| `--batch`       | `-B`  | string     | no       | —              | Queue into a named batch instead of executing immediately                                                   |
| `--scheduled`   | `-X`  | string     | no       | —              | Wrap as a scheduled transaction. Value is the local schedule record name                                    |

**Example:**

```bash
hcli token unfreeze --token MTK --account alice --freeze-key alice
hcli token unfreeze --token MTK --account alice --freeze-key alice --batch myBatch
```

**Output:** `{ transactionId, tokenId, accountId, network }`

---

### `hcli token pause` `[batchify]` `[scheduled]`

Pause all operations on a token (no transfers, minting, or burning). Pause key required (resolved from KMS when omitted).

| Option          | Short | Type       | Required | Default        | Description                                                                                                |
| --------------- | ----- | ---------- | -------- | -------------- | ---------------------------------------------------------------------------------------------------------- |
| `--token`       | `-T`  | string     | **yes**  | —              | Token alias or token ID                                                                                    |
| `--pause-key`   | `-p`  | repeatable | no       | —              | Pause key credential(s). Omit to auto-resolve from KMS when on-chain public key matches stored credentials |
| `--key-manager` | `-k`  | string     | no       | config default | Key manager: `local` or `local_encrypted`                                                                  |
| `--batch`       | `-B`  | string     | no       | —              | Queue into a named batch instead of executing immediately                                                  |
| `--scheduled`   | `-X`  | string     | no       | —              | Wrap as a scheduled transaction. Value is the local schedule record name                                   |

**Example:**

```bash
hcli token pause --token MTK
hcli token pause --token MTK --batch myBatch
```

**Output:** `{ transactionId, tokenId, network }`

---

### `hcli token unpause` `[batchify]` `[scheduled]`

Resume operations on a paused token. Pause key required (resolved from KMS when omitted).

| Option          | Short | Type       | Required | Default        | Description                                                                                                |
| --------------- | ----- | ---------- | -------- | -------------- | ---------------------------------------------------------------------------------------------------------- |
| `--token`       | `-T`  | string     | **yes**  | —              | Token alias or token ID                                                                                    |
| `--pause-key`   | `-p`  | repeatable | no       | —              | Pause key credential(s). Omit to auto-resolve from KMS when on-chain public key matches stored credentials |
| `--key-manager` | `-k`  | string     | no       | config default | Key manager: `local` or `local_encrypted`                                                                  |
| `--batch`       | `-B`  | string     | no       | —              | Queue into a named batch instead of executing immediately                                                  |
| `--scheduled`   | `-X`  | string     | no       | —              | Wrap as a scheduled transaction. Value is the local schedule record name                                   |

**Example:**

```bash
hcli token unpause --token MTK
hcli token unpause --token MTK --batch myBatch
```

**Output:** `{ transactionId, tokenId, network }`

---

### `hcli token grant-kyc` `[batchify]` `[scheduled]`

Grant KYC status to an account for a token. KYC key required (resolved from KMS when omitted).

| Option          | Short | Type       | Required | Default        | Description                                                                                                   |
| --------------- | ----- | ---------- | -------- | -------------- | ------------------------------------------------------------------------------------------------------------- |
| `--token`       | `-T`  | string     | **yes**  | —              | Token alias or token ID                                                                                       |
| `--account`     | `-a`  | string     | **yes**  | —              | Account to grant KYC (ID, alias, or EVM address)                                                              |
| `--kyc-key`     | `-y`  | repeatable | no       | —              | KYC key(s). Omit if KMS can resolve all required on-chain KYC public keys. Repeatable for KeyList / threshold |
| `--key-manager` | `-k`  | string     | no       | config default | Key manager: `local` or `local_encrypted`                                                                     |
| `--batch`       | `-B`  | string     | no       | —              | Queue into a named batch instead of executing immediately                                                     |
| `--scheduled`   | `-X`  | string     | no       | —              | Wrap as a scheduled transaction. Value is the local schedule record name                                      |

**Example:**

```bash
hcli token grant-kyc --token MTK --account alice
hcli token grant-kyc --token MTK --account alice --batch myBatch
hcli token grant-kyc --token MTK --account alice --scheduled mySchedule
```

**Output:** `{ transactionId, tokenId, accountId, network }`

---

### `hcli token revoke-kyc` `[batchify]` `[scheduled]`

Revoke KYC status from an account for a token. KYC key required (resolved from KMS when omitted).

| Option          | Short | Type       | Required | Default        | Description                                                                                                   |
| --------------- | ----- | ---------- | -------- | -------------- | ------------------------------------------------------------------------------------------------------------- |
| `--token`       | `-T`  | string     | **yes**  | —              | Token alias or token ID                                                                                       |
| `--account`     | `-a`  | string     | **yes**  | —              | Account to revoke KYC (ID, alias, or EVM address)                                                             |
| `--kyc-key`     | `-y`  | repeatable | no       | —              | KYC key(s). Omit if KMS can resolve all required on-chain KYC public keys. Repeatable for KeyList / threshold |
| `--key-manager` | `-k`  | string     | no       | config default | Key manager: `local` or `local_encrypted`                                                                     |
| `--batch`       | `-B`  | string     | no       | —              | Queue into a named batch instead of executing immediately                                                     |
| `--scheduled`   | `-X`  | string     | no       | —              | Wrap as a scheduled transaction. Value is the local schedule record name                                      |

**Example:**

```bash
hcli token revoke-kyc --token MTK --account alice
hcli token revoke-kyc --token MTK --account alice --batch myBatch
hcli token revoke-kyc --token MTK --account alice --scheduled mySchedule
```

**Output:** `{ transactionId, tokenId, accountId, network }`

---

### `hcli token dissociate` `[batchify]` `[scheduled]`

Dissociate a token from an account (reverse of `associate`).

| Option          | Short | Type   | Required | Default        | Description                                                              |
| --------------- | ----- | ------ | -------- | -------------- | ------------------------------------------------------------------------ |
| `--token`       | `-T`  | string | **yes**  | —              | Token alias or token ID                                                  |
| `--account`     | `-a`  | string | **yes**  | —              | Account to dissociate. Accepts any key format                            |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                                |
| `--batch`       | `-B`  | string | no       | —              | Queue into a named batch instead of executing immediately                |
| `--scheduled`   | `-X`  | string | no       | —              | Wrap as a scheduled transaction. Value is the local schedule record name |

**Example:**

```bash
hcli token dissociate --token MTK --account alice
hcli token dissociate --token 0.0.456 --account 0.0.789:302e...
hcli token dissociate --token MTK --account alice --batch myBatch
```

**Output:** `{ transactionId, accountId, tokenId, network }`

---

### `hcli token allowance-nft` `[batchify]`

Approve an NFT spender allowance for specific serials or all serials in a collection.

| Option          | Short | Type   | Required | Default        | Description                                                                        |
| --------------- | ----- | ------ | -------- | -------------- | ---------------------------------------------------------------------------------- |
| `--token`       | `-T`  | string | **yes**  | —              | NFT token alias or token ID                                                        |
| `--spender`     | `-s`  | string | **yes**  | —              | Spender account (ID, EVM address, or alias)                                        |
| `--owner`       | `-o`  | string | no       | operator       | Owner account. Accepts any key format. Defaults to operator                        |
| `--serials`     |       | string | no       | —              | Comma-separated serial numbers to approve. Mutually exclusive with `--all-serials` |
| `--all-serials` |       | flag   | no       | —              | Approve all serials in the collection. Mutually exclusive with `--serials`         |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                                          |
| `--batch`       | `-B`  | string | no       | —              | Queue into a named batch instead of executing immediately                          |

**Example:**

```bash
hcli token allowance-nft --token mynft --spender bob --serials "1,2,3"
hcli token allowance-nft --token mynft --spender bob --all-serials
hcli token allowance-nft --token mynft --spender bob --serials "1,2,3" --batch myBatch
```

**Output:** `{ transactionId, tokenId, ownerAccountId, spenderAccountId, serials[] | null, allSerials, network }` (`serials` is `null` when all serials were approved)

---

### `hcli token delete-allowance-nft` `[batchify]`

Delete (revoke) an NFT spender allowance for specific serials or a blanket all-serials approval.

| Option          | Short | Type   | Required | Default        | Description                                                                                                           |
| --------------- | ----- | ------ | -------- | -------------- | --------------------------------------------------------------------------------------------------------------------- |
| `--token`       | `-T`  | string | **yes**  | —              | NFT token alias or token ID                                                                                           |
| `--owner`       | `-o`  | string | no       | operator       | Owner account. Accepts any key format. Defaults to operator                                                           |
| `--serials`     |       | string | no       | —              | Comma-separated serial numbers to revoke. Mutually exclusive with `--all-serials`                                     |
| `--all-serials` |       | flag   | no       | `false`        | Revoke blanket all-serials approval for a specific spender. Requires `--spender`. Mutually exclusive with `--serials` |
| `--spender`     | `-s`  | string | no       | —              | Spender account. Required when using `--all-serials`; not used with `--serials`                                       |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                                                                             |
| `--batch`       | `-B`  | string | no       | —              | Queue into a named batch instead of executing immediately                                                             |

**Example:**

```bash
hcli token delete-allowance-nft --token mynft --serials "1,2"
hcli token delete-allowance-nft --token mynft --all-serials --spender bob
hcli token delete-allowance-nft --token mynft --serials "1,2" --batch myBatch
```

**Output:** `{ transactionId, tokenId, ownerAccountId, spenderAccountId | null, serials[] | null, allSerials, network }` (`spenderAccountId` is `null` when deleting specific serials; `serials` is `null` for an all-serials revoke)

---

### `hcli token airdrop-ft` `[batchify]`

Airdrop fungible tokens to one or more recipients in a single transaction. If a recipient lacks auto-association slots, the transfer becomes a pending airdrop.

| Option          | Short | Type       | Required | Default        | Description                                                                                      |
| --------------- | ----- | ---------- | -------- | -------------- | ------------------------------------------------------------------------------------------------ |
| `--token`       | `-T`  | string     | **yes**  | —              | Token alias or token ID                                                                          |
| `--to`          | `-t`  | repeatable | **yes**  | —              | Destination account (ID, EVM address, or alias). Pass multiple times for multiple recipients     |
| `--amount`      | `-a`  | repeatable | **yes**  | —              | Amount per recipient. Index-mapped to `--to`. Default: display units. Append `"t"` for raw units |
| `--from`        | `-f`  | string     | no       | operator       | Source account. Accepts any key format. Defaults to operator                                     |
| `--key-manager` | `-k`  | string     | no       | config default | Key manager: `local` or `local_encrypted`                                                        |
| `--batch`       | `-B`  | string     | no       | —              | Queue into a named batch instead of executing immediately                                        |

Number of `--to` flags must match number of `--amount` flags.

**Example:**

```bash
hcli token airdrop-ft --token MTK --to alice --amount 100
hcli token airdrop-ft --token MTK --to alice --amount 100 --to bob --amount 200
hcli token airdrop-ft --token MTK --to alice --amount 100 --batch myBatch
```

**Output:** `{ transactionId, tokenId, from, recipients[{ to, amount }], network }`

---

### `hcli token airdrop-nft` `[batchify]`

Airdrop NFT serials to one or more recipients in a single transaction. If a recipient lacks auto-association slots, the transfer becomes a pending airdrop.

| Option          | Short | Type       | Required | Default        | Description                                                                                                       |
| --------------- | ----- | ---------- | -------- | -------------- | ----------------------------------------------------------------------------------------------------------------- |
| `--token`       | `-T`  | string     | **yes**  | —              | Token alias or token ID                                                                                           |
| `--to`          | `-t`  | repeatable | **yes**  | —              | Destination account (ID, EVM address, or alias). Pass multiple times for multiple recipients                      |
| `--serials`     | `-s`  | repeatable | **yes**  | —              | Comma-separated serial numbers per recipient. Index-mapped to `--to`. Pass multiple times for multiple recipients |
| `--from`        | `-f`  | string     | no       | operator       | Source account. Accepts any key format. Defaults to operator                                                      |
| `--key-manager` | `-k`  | string     | no       | config default | Key manager: `local` or `local_encrypted`                                                                         |
| `--batch`       | `-B`  | string     | no       | —              | Queue into a named batch instead of executing immediately                                                         |

Number of `--to` flags must match number of `--serials` flags. No duplicate serial numbers allowed.

**Example:**

```bash
hcli token airdrop-nft --token mynft --to alice --serials "1,2"
hcli token airdrop-nft --token mynft --to alice --serials "1" --to bob --serials "2,3"
hcli token airdrop-nft --token mynft --to alice --serials "1,2" --batch myBatch
```

**Output:** `{ transactionId, tokenId, from, recipients[{ to, serials[] }], network }`

---

### `hcli token cancel-airdrop` `[batchify]` `[scheduled]`

Cancel a pending token airdrop (FT or NFT) before the recipient claims it. The sender must sign.

| Option          | Short | Type   | Required | Default        | Description                                                              |
| --------------- | ----- | ------ | -------- | -------------- | ------------------------------------------------------------------------ |
| `--token`       | `-T`  | string | **yes**  | —              | Token alias or token ID                                                  |
| `--receiver`    | `-r`  | string | **yes**  | —              | Receiver account (ID, EVM address, or alias)                             |
| `--serial`      | `-s`  | number | no       | —              | NFT serial number. If provided, cancels an NFT airdrop                   |
| `--from`        | `-f`  | string | no       | operator       | Sender key. Accepts any key format. Defaults to operator                 |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                                |
| `--batch`       | `-B`  | string | no       | —              | Queue into a named batch instead of executing immediately                |
| `--scheduled`   | `-X`  | string | no       | —              | Wrap as a scheduled transaction. Value is the local schedule record name |

**Example:**

```bash
hcli token cancel-airdrop --token MTK --receiver alice
hcli token cancel-airdrop --token mynft --receiver alice --serial 3
hcli token cancel-airdrop --token MTK --receiver alice --batch myBatch
```

**Output:** `{ transactionId, tokenId, sender, receiver, serial, network }`

---

### `hcli token claim-airdrop` `[batchify]`

Claim pending airdrops for an account (use `pending-airdrops` to list them first).

| Option          | Short | Type   | Required | Default        | Description                                                                                                       |
| --------------- | ----- | ------ | -------- | -------------- | ----------------------------------------------------------------------------------------------------------------- |
| `--account`     | `-a`  | string | **yes**  | —              | Receiver account ID or alias to claim airdrops for                                                                |
| `--index`       | `-i`  | string | **yes**  | —              | 1-based index(es) from the `pending-airdrops` list. Use comma-separated values to claim multiple: `--index 1,2,3` |
| `--from`        | `-f`  | string | no       | —              | Signing key for the receiver account                                                                              |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                                                                         |
| `--batch`       | `-B`  | string | no       | —              | Queue into a named batch instead of executing immediately                                                         |

**Example:**

```bash
hcli token claim-airdrop --account alice --index 1
hcli token claim-airdrop --account alice --index 1,2,3
hcli token claim-airdrop --account alice --index 1 --batch myBatch
```

**Output:** `{ transactionId, receiverAccountId, claimed[{ tokenId, tokenName, tokenSymbol, senderId, type, amount?, serialNumber? }], network }`

---

### `hcli token reject-airdrop` `[batchify]`

Reject a token from an account's balance (including received airdrops), returning it to the treasury. For NFTs, specify serial numbers with `--serial`.

| Option          | Short | Type   | Required | Default        | Description                                                             |
| --------------- | ----- | ------ | -------- | -------------- | ----------------------------------------------------------------------- |
| `--owner`       | `-o`  | string | **yes**  | —              | Owner account ID or alias                                               |
| `--token`       | `-t`  | string | **yes**  | —              | Token ID to reject (e.g. `0.0.5867883`)                                 |
| `--serial`      | `-s`  | string | no       | —              | NFT serial number(s). Required for NFT tokens. Comma-separated: `1,2,3` |
| `--from`        | `-f`  | string | no       | —              | Signing account. Defaults to owner account                              |
| `--key-manager` | `-k`  | string | no       | config default | Key manager: `local` or `local_encrypted`                               |
| `--batch`       | `-B`  | string | no       | —              | Queue into a named batch instead of executing immediately               |

**Example:**

```bash
hcli token reject-airdrop --owner alice --token 0.0.123456
hcli token reject-airdrop --owner alice --token 0.0.123456 --serial 1,2
hcli token reject-airdrop --owner alice --token 0.0.123456 --batch myBatch
```

**Output:** `{ transactionId, ownerAccountId, rejected{ tokenId, tokenName, tokenSymbol, type, serialNumbers? }, network }`

---

### `hcli token pending-airdrops`

List pending airdrops for an account (airdrops not yet claimed).

| Option       | Short | Type    | Required | Default | Description                             |
| ------------ | ----- | ------- | -------- | ------- | --------------------------------------- |
| `--account`  | `-a`  | string  | **yes**  | —       | Account ID or alias to query            |
| `--show-all` | `-A`  | boolean | no       | `false` | Fetch all pages instead of the first 25 |

**Example:**

```bash
hcli token pending-airdrops --account alice
hcli token pending-airdrops --account 0.0.123456 --show-all
```

**Output:** `{ account, network, airdrops[{ tokenId, tokenName, tokenSymbol, senderId, type, amount?, serialNumber? }], hasMore, total }`
