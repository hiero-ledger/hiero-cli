# Config Plugin

Configuration management plugin for the Hiero CLI.

## 🏗️ Architecture

This plugin follows the plugin architecture principles:

- **Stateless**: Plugin is functionally stateless
- **Dependency Injection**: Services are injected into command handlers
- **Manifest-Driven**: Capabilities declared via manifest with output specifications
- **Structured Output**: All command handlers return `CommandExecutionResult` with standardized output
- **Type Safety**: Full TypeScript support

## 📁 Structure

```
src/plugins/config/
├── manifest.ts              # Plugin manifest with command definitions
├── schema.ts                # Config option type inference utilities
├── commands/
│   ├── list/
│   │   ├── handler.ts      # List config options handler
│   │   ├── output.ts       # Output schema and template
│   │   └── index.ts        # Command exports
│   ├── get/
│   │   ├── handler.ts      # Get config option handler
│   │   ├── input.ts        # Input schema
│   │   ├── output.ts       # Output schema and template
│   │   └── index.ts        # Command exports
│   └── set/
│       ├── handler.ts      # Set config option handler
│       ├── input.ts        # Input schema
│       ├── output.ts       # Output schema and template
│       └── index.ts        # Command exports
├── __tests__/unit/         # Unit tests
└── index.ts                # Plugin exports
```

## 🚀 Commands

All commands return `CommandExecutionResult` with structured output that includes:

- `status`: Success or failure status
- `errorMessage`: Optional error message (present when status is not 'success')
- `outputJson`: JSON string conforming to the output schema defined in `output.ts`

Each command defines a Zod schema for output validation and a Handlebars template for human-readable formatting.

### Config List

List all available configuration options with their current values, types, and allowed values (for enum options).

```bash
hcli config list
```

**Output:**

```json
{
  "options": [
    {
      "name": "default_key_manager",
      "type": "enum",
      "value": "local",
      "allowedValues": ["local", "local_encrypted"]
    },
    {
      "name": "log_level",
      "type": "enum",
      "value": "silent",
      "allowedValues": ["silent", "error", "warn", "info", "debug"]
    },
    {
      "name": "ed25519_support_enabled",
      "type": "boolean",
      "value": false
    }
  ],
  "totalCount": 3
}
```

### Config Get

Get the value of a specific configuration option.

```bash
hcli config get -o default_key_manager
```

**Options:**

- `-o, --option <string>` - Option name to read (required)

**Output:**

```json
{
  "name": "default_key_manager",
  "type": "enum",
  "value": "local",
  "allowedValues": ["local", "local_encrypted"]
}
```

### Config Set

Set the value of a configuration option.

```bash
hcli config set -o default_key_manager -v local_encrypted
hcli config set -o log_level -v info
```

**Options:**

- `-o, --option <string>` - Option name to set (required)
- `-v, --value <string>` - Value to set (required)

**Output:**

```json
{
  "name": "default_key_manager",
  "type": "enum",
  "previousValue": "local",
  "newValue": "local_encrypted"
}
```

## 🔧 Core API Integration

The plugin uses the Core API services:

- `api.config` - Configuration option management (list, get, set)
- `api.logger` - Logging

## 📤 Output Formatting

All commands return structured output through the `CommandExecutionResult` interface:

```typescript
interface CommandExecutionResult {
  status: 'success' | 'failure';
  errorMessage?: string; // Present when status !== 'success'
  outputJson?: string; // JSON string conforming to the output schema
}
```

**Output Structure:**

- **Output Schemas**: Each command defines a Zod schema in `output.ts` for type-safe output validation
- **Human Templates**: Handlebars templates provide human-readable output formatting
- **Error Handling**: All errors are returned in the result structure, ensuring consistent error handling
- **Format Selection**: Output format is controlled by the CLI's `--format` option (default: `human`, or `json` for machine-readable output)

The `outputJson` field contains a JSON string that conforms to the Zod schema defined in each command's `output.ts` file, ensuring type safety and consistent output structure.

## 🧪 Testing

Unit tests located in `__tests__/unit/`:

```bash
npm test -- src/plugins/config/__tests__/unit
```

Test coverage includes:

- Listing configuration options
- Getting configuration option values
- Setting configuration option values
- Type validation for boolean, number, string, and enum values
- Error handling for invalid option names or values
- Enum value validation
