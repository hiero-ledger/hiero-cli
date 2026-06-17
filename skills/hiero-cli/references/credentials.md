# credentials plugin

Generate, import, list, and remove standalone private keys (key credentials) in the KMS.

Key references (format: `kr_xxx`) are identifiers for keys stored in the local key manager. They can be used in place of inline `accountId:privateKey` pairs in any command that accepts keys.

Key aliases (`--alias`) are human-readable names scoped to the current network that point to a key reference. They are distinct from account aliases — a key alias has no associated Hedera account ID.

---

### `hcli credentials generate`

Generate a new private key in KMS and optionally assign a key alias.

| Option          | Short | Type   | Required | Description                                   |
| --------------- | ----- | ------ | -------- | --------------------------------------------- |
| `--alias`       | `-a`  | string | no       | Human-readable alias to assign to this key    |
| `--key-type`    | `-t`  | string | no       | Key algorithm: `ecdsa` (default) or `ed25519` |
| `--key-manager` | `-k`  | string | no       | Storage method: `local` or `local_encrypted`  |

**Example:**

```
hcli credentials generate
hcli credentials generate --alias my-signing-key --key-type ed25519
```

**Output:** `{ keyRefId, publicKey, keyAlgorithm, keyManager, alias?, network? }`

---

### `hcli credentials import`

Import an existing private key into KMS and optionally assign a key alias.

| Option          | Short | Type   | Required | Description                                                                                    |
| --------------- | ----- | ------ | -------- | ---------------------------------------------------------------------------------------------- |
| `--key`         | `-K`  | string | **yes**  | Key to import: `{accountId}:{privateKey}`, `{ed25519\|ecdsa}:private:{hex}`, key ref, or alias |
| `--alias`       | `-a`  | string | no       | Alias to assign to this key                                                                    |
| `--key-manager` | `-k`  | string | no       | Storage method: `local` or `local_encrypted` (defaults to config setting)                      |

**Example:**

```
hcli credentials import --key ecdsa:private:abc123... --alias my-key
hcli credentials import --key 0.0.123456:302e... --key-manager local_encrypted
```

**Output:** `{ keyRefId, publicKey, keyManager, alias?, network? }`

---

### `hcli credentials list`

Show all stored credentials and their metadata, including any linked key alias on the current network. No options.

**Example:**

```
hcli credentials list
```

**Output:** `{ credentials: [{ keyRefId, keyManager, publicKey, keyAlgorithm, alias?, labels? }], totalCount }`

---

### `hcli credentials remove`

Remove credentials by key reference ID or key alias. Exactly one of `--id` or `--alias` must be provided.

Removing by `--id` also unregisters any key alias on the current network that points to that key, preventing dangling alias references.

⚠️ Requires confirmation. Use `--confirm` (`-Y`) to skip.

| Option    | Short | Type   | Required    | Description                                      |
| --------- | ----- | ------ | ----------- | ------------------------------------------------ |
| `--id`    | `-i`  | string | one of both | Key reference ID to remove (e.g. `kr_abc123`)    |
| `--alias` | `-a`  | string | one of both | Key alias to remove (also unregisters the alias) |

**Example:**

```
hcli credentials remove --id kr_abc123 --confirm
hcli credentials remove --alias my-signing-key --confirm
```

**Output:** `{ keyRefId }`
