# plugin-management plugin

Manage CLI plugins: add custom plugins, enable/disable, list, get info, remove, or reset to defaults.

---

## `hcli plugin-management list`

Show all loaded plugins with their status. No options.

**Example:**

```bash
hcli plugin-management list
```

**Output:** `{ plugins: [{ name, enabled }], count }`

---

## `hcli plugin-management info`

Show detailed information about a specific plugin.

| Option   | Short | Type   | Required | Description |
| -------- | ----- | ------ | -------- | ----------- |
| `--name` | `-n`  | string | **yes**  | Plugin name |

**Example:**

```bash
hcli plugin-management info --name token
```

**Output:** `{ found, message, plugin?: { name, version, displayName, description, commands[], enabled } }`

---

## `hcli plugin-management add`

Add a plugin by name (default plugin) or path (custom plugin).

| Option   | Short | Type   | Required | Description                                                  |
| -------- | ----- | ------ | -------- | ------------------------------------------------------------ |
| `--path` | `-p`  | string | no       | Filesystem path to plugin directory containing `manifest.js` |
| `--name` | `-n`  | string | no       | Name of a default plugin to add (e.g. `account`, `token`)    |

Exactly one of `--path` or `--name` must be provided (both together is rejected). Fails if a plugin with the same name already exists in state.

**Example:**

```bash
hcli plugin-management add --name token
hcli plugin-management add --path /home/user/my-custom-plugin
```

**Output:** `{ name, path, added, message }`

---

## `hcli plugin-management remove`

Remove a plugin from state.

| Option   | Short | Type   | Required | Description           |
| -------- | ----- | ------ | -------- | --------------------- |
| `--name` | `-n`  | string | **yes**  | Plugin name to remove |

**Example:**

```bash
hcli plugin-management remove --name token
```

**Output:** `{ name, removed, message }`

---

## `hcli plugin-management enable`

Enable a disabled plugin.

| Option   | Short | Type   | Required | Description           |
| -------- | ----- | ------ | -------- | --------------------- |
| `--name` | `-n`  | string | **yes**  | Plugin name to enable |

**Example:**

```bash
hcli plugin-management enable --name token
```

**Output:** `{ name, path, enabled, message }`

---

## `hcli plugin-management disable`

Disable an active plugin.

| Option   | Short | Type   | Required | Description            |
| -------- | ----- | ------ | -------- | ---------------------- |
| `--name` | `-n`  | string | **yes**  | Plugin name to disable |

**Example:**

```bash
hcli plugin-management disable --name token
```

**Output:** `{ name, removed, message }` (`removed` is `true` on successful disable)

---

## `hcli plugin-management reset`

Reset plugin state to defaults. Custom plugins will be removed.

⚠️ Requires confirmation. Use `--confirm` to skip. No options.

**Example:**

```bash
hcli plugin-management reset --confirm
```

**Output:** `{ reset, message }`
