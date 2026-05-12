# contract-erc20 plugin

Call ERC-20 standard functions on a deployed smart contract. Requires the contract to be deployed and imported into state first (see `contract` plugin).

All commands require `--contract` identifying the target ERC-20 contract by alias or contract ID.

State-changing commands (`transfer`, `transfer-from`, `approve`) are signed by the **network operator**. If the operator is not the token owner or approved spender, the transaction will fail on-chain.

---

### `hcli contract-erc20 name`

Call `name()` — returns the token name.

| Option       | Short | Type   | Required | Description          |
| ------------ | ----- | ------ | -------- | -------------------- |
| `--contract` | `-c`  | string | **yes**  | Contract alias or ID |

**Example:**

```
hcli contract-erc20 name --contract myErc20
```

**Output:** `{ name: string }`

---

### `hcli contract-erc20 symbol`

Call `symbol()` — returns the token symbol.

| Option       | Short | Type   | Required | Description          |
| ------------ | ----- | ------ | -------- | -------------------- |
| `--contract` | `-c`  | string | **yes**  | Contract alias or ID |

**Example:**

```
hcli contract-erc20 symbol --contract myErc20
```

**Output:** `{ symbol: string }`

---

### `hcli contract-erc20 decimals`

Call `decimals()` — returns the number of decimals.

| Option       | Short | Type   | Required | Description          |
| ------------ | ----- | ------ | -------- | -------------------- |
| `--contract` | `-c`  | string | **yes**  | Contract alias or ID |

**Example:**

```
hcli contract-erc20 decimals --contract myErc20
```

**Output:** `{ decimals: number }`

---

### `hcli contract-erc20 total-supply`

Call `totalSupply()` — returns total token supply.

| Option       | Short | Type   | Required | Description          |
| ------------ | ----- | ------ | -------- | -------------------- |
| `--contract` | `-c`  | string | **yes**  | Contract alias or ID |

**Example:**

```
hcli contract-erc20 total-supply --contract myErc20
```

**Output:** `{ totalSupply: number }`

---

### `hcli contract-erc20 balance-of`

Call `balanceOf(address)` — returns token balance for an account.

| Option       | Short | Type   | Required | Description                                |
| ------------ | ----- | ------ | -------- | ------------------------------------------ |
| `--contract` | `-c`  | string | **yes**  | Contract alias or ID                       |
| `--account`  | `-a`  | string | **yes**  | Account: alias, account ID, or EVM address |

**Example:**

```
hcli contract-erc20 balance-of --contract myErc20 --account 0.0.12345
hcli contract-erc20 balance-of --contract myErc20 --account 0xAbCd...
```

**Output:** `{ balance: number }`

---

### `hcli contract-erc20 allowance`

Call `allowance(owner, spender)` — returns approved spending amount.

| Option       | Short | Type   | Required | Description                                |
| ------------ | ----- | ------ | -------- | ------------------------------------------ |
| `--contract` | `-c`  | string | **yes**  | Contract alias or ID                       |
| `--owner`    | `-o`  | string | **yes**  | Owner: alias, account ID, or EVM address   |
| `--spender`  | `-s`  | string | **yes**  | Spender: alias, account ID, or EVM address |

**Example:**

```
hcli contract-erc20 allowance --contract myErc20 --owner alice --spender bob
```

**Output:** `{ allowance: number }`

---

### `hcli contract-erc20 transfer`

Call `transfer(to, value)` — transfer tokens to an address.

| Option       | Short | Type   | Required | Default  | Description                                        |
| ------------ | ----- | ------ | -------- | -------- | -------------------------------------------------- |
| `--contract` | `-c`  | string | **yes**  | —        | Contract alias, ID, or EVM address                 |
| `--to`       | `-t`  | string | **yes**  | —        | Recipient: alias, account ID, or EVM address       |
| `--value`    | `-v`  | number | **yes**  | —        | Token amount (raw integer, no decimals conversion) |
| `--gas`      | `-g`  | number | no       | `100000` | Gas limit                                          |

**Example:**

```
hcli contract-erc20 transfer --contract myErc20 --to alice --value 100
```

**Output:** `{ transactionId, to, value }`

---

### `hcli contract-erc20 transfer-from`

Call `transferFrom(from, to, value)` — transfer tokens on behalf of `from` (requires prior approval).

| Option       | Short | Type   | Required | Default  | Description                                       |
| ------------ | ----- | ------ | -------- | -------- | ------------------------------------------------- |
| `--contract` | `-c`  | string | **yes**  | —        | Contract alias, ID, or EVM address                |
| `--from`     | `-f`  | string | **yes**  | —        | Source account: alias, account ID, or EVM address |
| `--to`       | `-t`  | string | **yes**  | —        | Recipient: alias, account ID, or EVM address      |
| `--value`    | `-v`  | number | **yes**  | —        | Token amount                                      |
| `--gas`      | `-g`  | number | no       | `100000` | Gas limit                                         |

**Example:**

```
hcli contract-erc20 transfer-from --contract myErc20 --from alice --to bob --value 50
```

**Output:** `{ transactionId, from, to, value }`

---

### `hcli contract-erc20 approve`

Call `approve(spender, value)` — approve a spender to spend tokens.

| Option       | Short | Type   | Required | Default  | Description                                |
| ------------ | ----- | ------ | -------- | -------- | ------------------------------------------ |
| `--contract` | `-c`  | string | **yes**  | —        | Contract alias, ID, or EVM address         |
| `--spender`  | `-s`  | string | **yes**  | —        | Spender: alias, account ID, or EVM address |
| `--value`    | `-v`  | number | **yes**  | —        | Amount to approve                          |
| `--gas`      | `-g`  | number | no       | `100000` | Gas limit                                  |

**Example:**

```
hcli contract-erc20 approve --contract myErc20 --spender bob --value 200
```

**Output:** `{ transactionId, spender, value }`
