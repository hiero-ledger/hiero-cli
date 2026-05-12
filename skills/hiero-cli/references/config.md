# config plugin

Manage CLI configuration options: list all settings, get or set individual values.

## Available options

| Option                    | Type    | Default  | Allowed values                             | Description                                              |
| ------------------------- | ------- | -------- | ------------------------------------------ | -------------------------------------------------------- |
| `ed25519_support_enabled` | boolean | `false`  | `true`, `false`                            | Enable Ed25519 key support                               |
| `log_level`               | enum    | `silent` | `silent`, `error`, `warn`, `info`, `debug` | CLI logging verbosity                                    |
| `default_key_manager`     | enum    | `local`  | `local`, `local_encrypted`                 | Default key manager used when `--key-manager` is omitted |
| `skip_confirmations`      | boolean | `false`  | `true`, `false`                            | Skip all confirmation prompts globally                   |

---

### `hcli config list`

List all configuration options with their current values. No options.

**Example:**

```
hcli config list
```

**Output:** `{ totalCount, options: [{ name, type, value, allowedValues? }] }`

---

### `hcli config get`

Get the value of a single configuration option.

| Option     | Short | Type   | Required | Description         |
| ---------- | ----- | ------ | -------- | ------------------- |
| `--option` | `-o`  | string | **yes**  | Option name to read |

**Example:**

```
hcli config get --option default_key_manager
```

**Output:** `{ name, type, value, allowedValues? }`

---

### `hcli config set`

Set the value of a configuration option.

| Option     | Short | Type   | Required | Description                                                        |
| ---------- | ----- | ------ | -------- | ------------------------------------------------------------------ |
| `--option` | `-o`  | string | **yes**  | Option name to set. Use `config list` to see available options     |
| `--value`  | `-v`  | string | **yes**  | Value to set. Booleans: `true`/`false`. Numbers as strings: `"10"` |

**Example:**

```
hcli config set --option default_key_manager --value local_encrypted
hcli config set --option skip_confirmations --value true
```

**Output:** `{ name, previousValue, newValue }`
