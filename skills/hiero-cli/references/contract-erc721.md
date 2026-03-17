# contract-erc721 plugin

Call ERC-721 standard functions on a deployed smart contract. Requires the contract to be deployed and imported into state first (see `contract` plugin).

State-changing commands (`approve`, `set-approval-for-all`, `safe-transfer-from`, `transfer-from`, `mint`) are signed by the **network operator**. If the operator is not the token owner or approved address, the transaction will fail on-chain.

---

### `hcli contract-erc721 name`

Call `name()` — returns the NFT collection name.

| Option       | Short | Type   | Required | Description          |
| ------------ | ----- | ------ | -------- | -------------------- |
| `--contract` | `-c`  | string | **yes**  | Contract alias or ID |

**Example:**

```
hcli contract-erc721 name --contract myNft
```

**Output:** `{ name: string }`

---

### `hcli contract-erc721 symbol`

Call `symbol()` — returns the token symbol.

| Option       | Short | Type   | Required | Description          |
| ------------ | ----- | ------ | -------- | -------------------- |
| `--contract` | `-c`  | string | **yes**  | Contract alias or ID |

**Example:**

```
hcli contract-erc721 symbol --contract myNft
```

**Output:** `{ symbol: string }`

---

### `hcli contract-erc721 balance-of`

Call `balanceOf(owner)` — returns NFT count owned by an address.

| Option       | Short | Type   | Required | Description                                |
| ------------ | ----- | ------ | -------- | ------------------------------------------ |
| `--contract` | `-c`  | string | **yes**  | Contract alias or ID                       |
| `--owner`    | `-o`  | string | **yes**  | Account: alias, account ID, or EVM address |

**Example:**

```
hcli contract-erc721 balance-of --contract myNft --owner alice
```

**Output:** `{ balance: number }`

---

### `hcli contract-erc721 owner-of`

Call `ownerOf(tokenId)` — returns the owner address of a specific token.

| Option       | Short | Type   | Required | Description          |
| ------------ | ----- | ------ | -------- | -------------------- |
| `--contract` | `-c`  | string | **yes**  | Contract alias or ID |
| `--token-id` | `-T`  | number | **yes**  | Token ID (uint256)   |

**Example:**

```
hcli contract-erc721 owner-of --contract myNft --token-id 1
```

**Output:** `{ owner: string }`

---

### `hcli contract-erc721 token-uri`

Call `tokenURI(tokenId)` — returns the metadata URI for a token.

| Option       | Short | Type   | Required | Description          |
| ------------ | ----- | ------ | -------- | -------------------- |
| `--contract` | `-c`  | string | **yes**  | Contract alias or ID |
| `--token-id` | `-T`  | number | **yes**  | Token ID (uint256)   |

**Example:**

```
hcli contract-erc721 token-uri --contract myNft --token-id 1
```

**Output:** `{ tokenURI: string }`

---

### `hcli contract-erc721 get-approved`

Call `getApproved(tokenId)` — returns the approved address for a token.

| Option       | Short | Type   | Required | Description          |
| ------------ | ----- | ------ | -------- | -------------------- |
| `--contract` | `-c`  | string | **yes**  | Contract alias or ID |
| `--token-id` | `-T`  | number | **yes**  | Token ID (uint256)   |

**Example:**

```
hcli contract-erc721 get-approved --contract myNft --token-id 1
```

**Output:** `{ approved: string }`

---

### `hcli contract-erc721 is-approved-for-all`

Call `isApprovedForAll(owner, operator)` — check if an operator is approved for all tokens.

| Option       | Short | Type   | Required | Description                                 |
| ------------ | ----- | ------ | -------- | ------------------------------------------- |
| `--contract` | `-c`  | string | **yes**  | Contract alias, ID, or EVM address          |
| `--owner`    | `-o`  | string | **yes**  | Owner: alias, account ID, or EVM address    |
| `--operator` | `-p`  | string | **yes**  | Operator: alias, account ID, or EVM address |

**Example:**

```
hcli contract-erc721 is-approved-for-all --contract myNft --owner alice --operator bob
```

**Output:** `{ isApproved: boolean }`

---

### `hcli contract-erc721 approve`

Call `approve(to, tokenId)` — approve an address to transfer a specific token.

| Option       | Short | Type   | Required | Default  | Description                                           |
| ------------ | ----- | ------ | -------- | -------- | ----------------------------------------------------- |
| `--contract` | `-c`  | string | **yes**  | —        | Contract alias, ID, or EVM address                    |
| `--to`       | `-t`  | string | **yes**  | —        | Address to approve: alias, account ID, or EVM address |
| `--token-id` | `-T`  | number | **yes**  | —        | Token ID (uint256) to approve                         |
| `--gas`      | `-g`  | number | no       | `100000` | Gas limit                                             |

**Example:**

```
hcli contract-erc721 approve --contract myNft --to alice --token-id 1
```

**Output:** `{ transactionId, to, tokenId }`

---

### `hcli contract-erc721 set-approval-for-all`

Call `setApprovalForAll(operator, approved)` — grant/revoke operator approval for all tokens.

| Option       | Short | Type   | Required | Default  | Description                                 |
| ------------ | ----- | ------ | -------- | -------- | ------------------------------------------- |
| `--contract` | `-c`  | string | **yes**  | —        | Contract alias, ID, or EVM address          |
| `--operator` | `-o`  | string | **yes**  | —        | Operator: alias, account ID, or EVM address |
| `--approved` | `-a`  | string | **yes**  | —        | `"true"` to approve, `"false"` to revoke    |
| `--gas`      | `-g`  | number | no       | `100000` | Gas limit                                   |

**Example:**

```
hcli contract-erc721 set-approval-for-all --contract myNft --operator bob --approved true
```

**Output:** `{ transactionId, operator, approved }`

---

### `hcli contract-erc721 safe-transfer-from`

Call `safeTransferFrom(from, to, tokenId[, data])` — safely transfer a token.

| Option       | Short | Type   | Required | Default  | Description                                            |
| ------------ | ----- | ------ | -------- | -------- | ------------------------------------------------------ |
| `--contract` | `-c`  | string | **yes**  | —        | Contract alias, ID, or EVM address                     |
| `--from`     | `-f`  | string | **yes**  | —        | Current owner: alias, account ID, or EVM address       |
| `--to`       | `-t`  | string | **yes**  | —        | Recipient: alias, account ID, or EVM address           |
| `--token-id` | `-T`  | number | **yes**  | —        | Token ID (uint256) to transfer                         |
| `--gas`      | `-g`  | number | no       | `100000` | Gas limit                                              |
| `--data`     | `-d`  | string | no       | —        | Optional arbitrary bytes data (for 4-argument variant) |

**Example:**

```
hcli contract-erc721 safe-transfer-from --contract myNft --from alice --to bob --token-id 1
```

**Output:** `{ transactionId, from, to, tokenId }`

---

### `hcli contract-erc721 transfer-from`

Call `transferFrom(from, to, tokenId)` — transfer a token (no safety check).

| Option       | Short | Type   | Required | Default  | Description                                      |
| ------------ | ----- | ------ | -------- | -------- | ------------------------------------------------ |
| `--contract` | `-c`  | string | **yes**  | —        | Contract alias, ID, or EVM address               |
| `--from`     | `-f`  | string | **yes**  | —        | Current owner: alias, account ID, or EVM address |
| `--to`       | `-t`  | string | **yes**  | —        | Recipient: alias, account ID, or EVM address     |
| `--token-id` | `-T`  | number | **yes**  | —        | Token ID (uint256)                               |
| `--gas`      | `-g`  | number | no       | `100000` | Gas limit                                        |

**Example:**

```
hcli contract-erc721 transfer-from --contract myNft --from alice --to bob --token-id 1
```

**Output:** `{ transactionId, from, to, tokenId }`

---

### `hcli contract-erc721 mint` ⚠️ EXPERIMENTAL

Call custom `mint(to, tokenId)` — mint a new token. Requires a custom `mint` function in the ERC-721 contract (not part of the standard interface).

| Option       | Short | Type   | Required | Default  | Description                                  |
| ------------ | ----- | ------ | -------- | -------- | -------------------------------------------- |
| `--contract` | `-c`  | string | **yes**  | —        | Contract alias, ID, or EVM address           |
| `--to`       | `-t`  | string | **yes**  | —        | Recipient: alias, account ID, or EVM address |
| `--token-id` | `-T`  | number | **yes**  | —        | Token ID (uint256) to mint                   |
| `--gas`      | `-g`  | number | no       | `100000` | Gas limit                                    |

**Example:**

```
hcli contract-erc721 mint --contract myNft --to alice --token-id 42
```

**Output:** `{ transactionId, to, tokenId }`
