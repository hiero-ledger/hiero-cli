# Plugin Management Plugin

A plugin for managing other plugins in the Hiero CLI system.

## Overview

This plugin provides functionality to add, remove, list, and get information about plugins in the system. All commands return structured `CommandExecutionResult` with both JSON and human-readable output formats.

## Commands

### `add`

Add a new plugin to the system from a plugin directory path.

**Options:**

- `--path, -p` (required): Filesystem path to the plugin directory containing `manifest.js`

**Example:**

```bash
hcli plugin-management add --path ./dist/plugins/my-plugin
```

### `remove`

Remove a plugin from the system.

**Options:**

- `--name, -n` (required): Name of the plugin to remove

**Example:**

```bash
hcli plugin-management remove --name my-plugin
```

### `list`

List all available plugins in the system.

**Example:**

```bash
hcli plugin-management list
```

### `info`

Get detailed information about a specific plugin.

**Options:**

- `--name, -n` (required): Name of the plugin to get information about

**Example:**

```bash
hcli plugin-management info --name account
```

### `enable`

Enable a plugin that exists in the plugin-management state.

**Options:**

- `--name, -n` (required): Name of the plugin to enable

**Example:**

```bash
hcli plugin-management enable --name account
```

### `disable`

Disable a plugin that exists in the plugin-management state.

**Options:**

- `--name, -n` (required): Name of the plugin to disable

**Example:**

```bash
hcli plugin-management disable --name account
```

### `reset`

Clear plugin-management state. Custom plugins will be removed. This is a destructive operation and requires confirmation.

**Options:**

- None

**Example:**

```bash
hcli plugin-management reset
```

## Plugin Management State

The plugin-management state is stored in `~/.hiero-cli/state/plugin-management-storage.json`. It contains:

**Plugin entries** – one key per plugin (e.g. `account`, `token`, `network`), each with:

- `name`, `enabled`, `description`, and optionally `path` for custom plugins

**`initialized-defaults`** – metadata key (always first in the file) listing default plugin names that have been initialized at least once. Used to:

- Add new default plugins when they appear in `DEFAULT_PLUGIN_STATE` (e.g. after a CLI update)
- Avoid re-adding default plugins that the user explicitly removed

**Auto-initialization:** On each CLI start, any default plugin from `DEFAULT_PLUGIN_STATE` that is not in `initialized-defaults` is added to the state and to `initialized-defaults`. Default plugins removed by the user stay removed.

**Custom plugins** are never added to `initialized-defaults`; they are fully removed from state when the user runs `remove`.

## Output Formats

All commands support both JSON and human-readable output formats:

- **JSON**: Structured data for programmatic use
- **Human-readable**: Formatted text for terminal display

## Architecture

All commands return structured output through the `CommandExecutionResult` interface:

```typescript
interface CommandExecutionResult {
  status: 'success' | 'failure';
  errorMessage?: string; // Present when status !== 'success'
  outputJson?: string; // JSON string conforming to the output schema
}
```

**Output Structure:**

- **Command Handlers**: Return `CommandExecutionResult` objects
- **Output Schemas**: Defined using Zod for validation and type safety
- **Templates**: Handlebars templates for human-readable output
- **Error Handling**: Consistent error handling across all commands

The `outputJson` field contains a JSON string that conforms to the Zod schema defined in each command's `output.ts` file, ensuring type safety and consistent output structure.

## Directory Structure

```
src/plugins/plugin-management/
├── commands/
│   ├── add/
│   │   ├── input.ts
│   │   ├── handler.ts
│   │   ├── output.ts
│   │   └── index.ts
│   ├── remove/
│   │   ├── input.ts
│   │   ├── handler.ts
│   │   ├── output.ts
│   │   └── index.ts
│   ├── reset/
│   │   ├── handler.ts
│   │   ├── output.ts
│   │   └── index.ts
│   ├── list/
│   │   ├── handler.ts
│   │   ├── output.ts
│   │   └── index.ts
│   ├── enable/
│   │   ├── input.ts
│   │   ├── handler.ts
│   │   ├── output.ts
│   │   └── index.ts
│   ├── disable/
│   │   ├── input.ts
│   │   ├── handler.ts
│   │   ├── output.ts
│   │   └── index.ts
│   └── info/
│       ├── input.ts
│       ├── handler.ts
│       ├── output.ts
│       └── index.ts
├── schema.ts               # Shared data schemas
├── manifest.ts             # Plugin manifest
├── index.ts                # Main exports
└── README.md               # This file
```

## Implementation Notes

- All handlers return `CommandExecutionResult` objects
- Output schemas are defined using Zod for runtime validation
- Human-readable templates use Handlebars syntax
- Mock data is used for demonstration purposes
- Real implementation would integrate with the plugin manager service
