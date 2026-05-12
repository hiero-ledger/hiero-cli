# network plugin

Configure and manage Hedera network connections: list available networks, switch active network, get/set operator credentials.

**Must be configured before any blockchain transaction.**

---

### `hcli network list`

List all available networks with their configuration and health status. No options.

**Example:**

```
hcli network list
```

**Output:** Array of `{ name, active, nodeAddress, mirrorNode, status }`

---

### `hcli network use`

Switch the active network.

| Option     | Short | Type   | Required | Description                                                     |
| ---------- | ----- | ------ | -------- | --------------------------------------------------------------- |
| `--global` | `-g`  | string | **yes**  | Network name: `testnet`, `mainnet`, `previewnet`, or `localnet` |

**Example:**

```
hcli network use --global testnet
hcli network use --global mainnet
```

**Output:** `{ network, active: true }`

---

### `hcli network get-operator`

Get the current operator credentials for the active network. No options.

**Example:**

```
hcli network get-operator
```

**Output:** `{ accountId, publicKey, keyRef }`

---

### `hcli network set-operator`

Set operator credentials for signing transactions on the active network.

| Option          | Short | Type   | Required | Description                                                                         |
| --------------- | ----- | ------ | -------- | ----------------------------------------------------------------------------------- |
| `--operator`    | `-o`  | string | **yes**  | Credentials: `accountId:privateKey`, key reference `kr_xxx`, or account alias       |
| `--key-manager` | `-k`  | string | no       | Key manager: `local` or `local_encrypted`. Defaults to `config.default_key_manager` |

**Example:**

```
hcli network set-operator --operator 0.0.12345:302e020100300506...
hcli network set-operator --operator myAccountAlias
```

**Output:** `{ accountId, network, keyRef }`
