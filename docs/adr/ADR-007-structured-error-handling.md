### ADR-007: Structured Error Handling with Typed CliError Hierarchy

- Status: Proposed
- Date: 2025-01-12
- Owner: Tech Lead, Hiero CLI
- Related: `src/core/utils/error-handler.ts`, `src/core/plugins/plugin-manager.ts`, `docs/adr/ADR-003-command-handler-result-contract.md`

## Context

ADR-003 introduced the `CommandExecutionResult` contract where handlers return `{status, errorMessage?, outputJson?}`. While this established a consistent output contract, the current implementation suffers from several issues:

1. **Boilerplate proliferation**: Every handler (~68 catch blocks across 47 files) contains identical try-catch patterns:

   ```typescript
   try {
     // logic
     return { status: Status.Success, outputJson: ... };
   } catch (error) {
     return { status: Status.Failure, errorMessage: formatError('...', error) };
   }
   ```

2. **Nested error handling**: Complex handlers have multiple `return { status: Status.Failure }` statements at different nesting levels (e.g., balance handler has 3 failure return points).

3. **Information loss**: All errors are stringified to `errorMessage`, losing type information, error codes, and structured context needed for scripting.

4. **No scripting-friendly codes**: JSON output is `{status: "failure", errorMessage: "..."}` which scripts must parse heuristically.

5. **Inconsistent service errors**: Services throw raw `Error` objects; handlers must catch and transform them individually, or rely on global handler to catch and handle them.

### Future Considerations: Retry Strategy

The `recoverable` property introduced in this ADR is designed to support a future retry mechanism. The planned retry strategy will:

- Provide `api.retry()` wrapper with exponential backoff and jitter
- Use `CliError.recoverable` to determine if an operation should be retried
- Be configurable via `hiero config set retry_*` options
- Integrate seamlessly with `NetworkError` (recoverable by default) and other error types

This ADR establishes the error type foundation that makes intelligent retry decisions possible.

## Decision

Replace the return-based error handling with a throw-based model using a structured `CliError` hierarchy:

1. **Introduce `ErrorCode` enum**: Predefined error codes for structured error handling. External plugins should prefer these codes when semantics match.

2. **Introduce `CliError` base class**: Structured error with `code`, `message`, `context`, `cause`, and `recoverable` properties.

3. **Provide typed error subclasses**: `ValidationError`, `NotFoundError`, `NetworkError`, `TransactionError`, etc.

4. **Handlers throw errors**: Instead of returning `{status: Failure}`, handlers throw `CliError` instances. Core catches and formats them.

5. **Services throw `CliError` directly**: Removes the need for handlers to catch and transform service errors.

6. **Core error boundary handles all**: The existing try-catch in `plugin-manager.ts` becomes the single point of error handling.

7. **JSON output includes structured error data**: Error code, message, context, and cause for scripting consumption.

8. **Simplified handler return type**: Handlers return an updated `CommandExecutionResult<T>` containing only the data in a `result` field. Core handles serialization and adds `status: "success"` to the final flat JSON output. This eliminates redundant boilerplate while allowing for future extensibility (e.g., adding metadata).

## Specification

### ErrorCode Enum

```typescript
// src/core/errors/error-code.ts

/**
 * Predefined CLI error codes for structured error handling.
 * External plugins should prefer these codes when semantics match.
 * Custom codes are allowed for domain-specific errors.
 */
export enum ErrorCode {
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  TRANSACTION_ERROR = 'TRANSACTION_ERROR',
  STATE_ERROR = 'STATE_ERROR',
  PLUGIN_ERROR = 'PLUGIN_ERROR',
  FILE_ERROR = 'FILE_ERROR',
}

// All errors exit with code 1. Scripts differentiate errors via JSON `code` field.
export const CLI_ERROR_EXIT_CODE = 1;
```

### CliError Base Class

```typescript
// src/core/errors/cli-error.ts

export interface CliErrorOptions {
  code: ErrorCode;
  message: string;
  cause?: unknown;
  context?: Record<string, unknown>;
  recoverable: boolean;
}

export class CliError extends Error {
  readonly code: ErrorCode;
  readonly context?: Record<string, unknown>;
  readonly recoverable: boolean;
  override readonly cause?: unknown;

  constructor(options: CliErrorOptions) {
    super(options.message);
    this.name = 'CliError';
    this.code = options.code;
    this.cause = options.cause;
    this.context = options.context;
    this.recoverable = options.recoverable;
  }

  toJSON(): object {
    return {
      code: this.code,
      message: this.message,
      ...(this.context && { context: this.context }),
      ...(this.cause && { cause: this.formatCause() }),
    };
  }
}
```

### Error Type Hierarchy

| Class                | ErrorCode             | Recoverable       | Use Case                                                 |
| -------------------- | --------------------- | ----------------- | -------------------------------------------------------- |
| `ValidationError`    | `VALIDATION_ERROR`    | No                | Input validation, Zod errors                             |
| `NotFoundError`      | `NOT_FOUND`           | No                | Entity not found (account, token, alias)                 |
| `NetworkError`       | `NETWORK_ERROR`       | Yes               | HTTP 5xx, timeouts, connection errors                    |
| `AuthorizationError` | `AUTHORIZATION_ERROR` | No                | Permission denied, invalid keys, HTTP 401/403            |
| `ConfigurationError` | `CONFIGURATION_ERROR` | No                | Missing config, invalid settings                         |
| `TransactionError`   | `TRANSACTION_ERROR`   | Depends on status | Hedera transaction failures (BUSY_NETWORK → recoverable) |
| `StateError`         | `STATE_ERROR`         | No                | State corruption, invalid state                          |
| `FileError`          | `FILE_ERROR`          | No                | File I/O errors                                          |

**Note**: All errors exit with code 1. Scripts should use the JSON `code` field to differentiate error types.

### ValidationError with Zod Support

```typescript
export class ValidationError extends CliError {
  readonly issues?: string[];

  constructor(
    message: string,
    options?: { context?: Record<string, unknown>; cause?: unknown },
  ) {
    super({
      code: ErrorCode.VALIDATION_ERROR,
      message,
      recoverable: false,
      ...options,
    });
  }

  static fromZod(zodError: ZodError): ValidationError {
    const issues = zodError.issues.map((i) => i.message);
    const error = new ValidationError(
      `Validation failed:\n${issues.map((i) => `  - ${i}`).join('\n')}`,
      { context: { issues }, cause: zodError },
    );
    (error as { issues: string[] }).issues = issues;
    return error;
  }
}
```

### JSON Error Output Format

Success (new structured format):

```json
{
  "status": "success",
  "accountId": "0.0.123",
  "hbarBalance": "100000000"
}
```

Failure (new structured format):

```json
{
  "status": "failure",
  "code": "NOT_FOUND",
  "message": "Account not found: myaccount",
  "context": {
    "entityType": "Account",
    "identifier": "myaccount"
  },
  "cause": "Request failed with status code 404"
}
```

Validation failure:

```json
{
  "status": "failure",
  "code": "VALIDATION_ERROR",
  "message": "Validation failed:\n  - Account ID is required",
  "context": { "issues": ["Account ID is required"] },
  "cause": ["Account ID is required"]
}
```

### Human-Readable Format

```
Error [NOT_FOUND]: Account not found: myaccount
  Caused by: Request failed with status code 404
```

> **Note**: This is an additional simplification on top of the throw-based error model. Handlers no longer return the old `CommandExecutionResult` - they return a simplified version `{ result: T }`. Core handles serialization and adds `status: "success"` to the flat output.

**Rationale**:

- `status: Success` is redundant - if handler didn't throw, it succeeded
- `JSON.stringify()` in every handler is boilerplate - core should serialize
- Handlers shouldn't know about output format (JSON/table/etc.)

**New handler contract**:

```typescript
// src/core/types/command-handler.ts

export interface CommandExecutionResult<T = unknown> {
  result: T;
}

// Handler returns result data, core adds status and serializes
type CommandHandler<T = unknown> = (
  args: CommandHandlerArgs,
) => Promise<CommandExecutionResult<T>>;

// Core execution (simplified)
async function executeHandler<T>(
  handler: CommandHandler<T>,
  args: CommandHandlerArgs,
  format: OutputFormat,
): Promise<void> {
  try {
    const handlerResult = await handler(args);
    const output =
      format === 'json'
        ? JSON.stringify({ status: 'success', ...handlerResult.result })
        : formatAsTable(handlerResult.result);
    console.log(output);
    process.exit(0);
  } catch (error) {
    formatAndExitWithError(error, format);
  }
}

// Handler returns wrapped result, core adds status and serializes
type CommandHandler<T = unknown> = (
  args: CommandHandlerArgs,
) => Promise<CommandResponse<T>>;

// Core execution (simplified)
async function executeHandler<T>(
  handler: CommandHandler<T>,
  args: CommandHandlerArgs,
  format: OutputFormat,
): Promise<void> {
  try {
    const handlerResult = await handler(args);
    const output =
      format === 'json'
        ? JSON.stringify({ status: 'success', ...handlerResult })
        : formatAsTable(handlerResult.result);
    console.log(output);
    process.exit(0);
  } catch (error) {
    formatAndExitWithError(error, format);
  }
}
```

### Handler Migration

Before (current):

```typescript
export async function getAccountBalance(args: CommandHandlerArgs): Promise<CommandExecutionResult> {
  const validArgs = AccountBalanceInputSchema.parse(args.args);

  try {
    const account = api.alias.resolve(validArgs.account, ALIAS_TYPE.Account, network);
    if (!account) {
      return { status: Status.Failure, errorMessage: `Account not found: ${validArgs.account}` };
    }

    try {
      const balances = await fetchAccountTokenBalances(...);
    } catch (error) {
      return { status: Status.Failure, errorMessage: formatError('Could not fetch token balances', error) };
    }

    return { status: Status.Success, outputJson: JSON.stringify(output) };
  } catch (error) {
    return { status: Status.Failure, errorMessage: formatError('Failed to get account balance', error) };
  }
}
```

After (new approach):

```typescript
// Handler returns result data - no status boilerplate, no stringify
export async function getAccountBalance(args: CommandHandlerArgs): Promise<CommandExecutionResult<AccountBalanceOutput>> {
  const validArgs = AccountBalanceInputSchema.parse(args.args);

  const account = api.alias.resolve(validArgs.account, ALIAS_TYPE.Account, network);
  if (!account) {
    throw new NotFoundError('Account', validArgs.account);
  }

  // fetchAccountTokenBalances throws NetworkError - core catches it
  const balances = await fetchAccountTokenBalances(...);

  // Return data object - core adds status: success and serializes to flat JSON
  return {
    result: {
      accountId: account.id,
      hbarBalance: balances.hbar,
      tokens: balances.tokens,
    },
  };
}
```

**Result**: ~50% less code, zero try-catch, zero serialization in handler.

### Service Error Throwing

Services throw `CliError` directly for simplicity:

```typescript
// mirrornode-service.ts
async getAccountHBarBalance(accountId: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      // Map HTTP status to appropriate error type
      if (response.status === 404) {
        throw new NotFoundError('Account', accountId);
      }
      if (response.status === 400 || response.status === 422) {
        throw new ValidationError(`Invalid request: ${response.statusText}`, { context: { accountId } });
      }
      if (response.status === 401 || response.status === 403) {
        throw new AuthorizationError(`Access denied: ${response.statusText}`, { context: { accountId } });
      }
      // 5xx and other errors → NetworkError (recoverable)
      throw new NetworkError(`Mirror node error: ${response.status}`, { recoverable: true });
    }
    return response.data.balance.balance.toString();
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new NetworkError(`Failed to fetch balance for ${accountId}`, { cause: error, recoverable: true });
  }
}
```

### External Plugin Support

Plugins should use core error types when semantics match. Custom errors are allowed for domain-specific failures but must explicitly set `recoverable`.

**Recommended: Use core error types**

```typescript
// my-plugin/handler.ts
import {
  CliError,
  ErrorCode,
  NotFoundError,
  NetworkError,
} from '@hiero/cli-core';

export async function myHandler(args: CommandHandlerArgs) {
  if (!entity) {
    throw new NotFoundError('MyEntity', entityId);
  }

  if (rateLimited) {
    throw new NetworkError('Rate limited', { recoverable: true });
  }
}
```

**Allowed: Custom error codes for domain-specific errors**

```typescript
class InsufficientGasError extends CliError {
  constructor(required: string, available: string) {
    super({
      code: 'INSUFFICIENT_GAS' as ErrorCode,
      message: `Insufficient gas: need ${required}, have ${available}`,
      recoverable: true,
      context: { required, available },
    });
  }
}

class SignatureExpiredError extends CliError {
  constructor(expiredAt: string) {
    super({
      code: 'SIGNATURE_EXPIRED' as ErrorCode,
      message: `Signature expired at ${expiredAt}`,
      recoverable: false,
      context: { expiredAt },
    });
  }
}
```

**Scripting considerations**: Scripts can handle custom codes with fallback logic:

```bash
result=$(hiero account balance myaccount --format json)
code=$(echo "$result" | jq -r '.code')

case "$code" in
  NOT_FOUND) echo "Creating..." ;;
  NETWORK_ERROR | INSUFFICIENT_GAS) echo "Retrying..." ;;
  *) echo "Unknown error: $code" && exit 1 ;;
esac
```

## Rationale

1. **Single error boundary**: Core's existing try-catch in `executePluginCommand` becomes the sole point of error handling, eliminating duplicated catch blocks in handlers.

2. **Type-safe error codes**: `ErrorCode` enum prevents typos and enables IDE autocomplete. Scripts differentiate errors via JSON `code` field.

3. **Scripting first**: Structured JSON with `code`, `message`, `context` enables reliable script automation without string parsing.

4. **Retry-ready**: The `recoverable` flag provides semantic information for the future retry mechanism. `NetworkError` defaults to `recoverable: true`, enabling automatic retry for transient failures.

5. **Service simplification**: Services throwing `CliError` directly removes transformation boilerplate from handlers.

6. **Plugin extensibility**: Plugins can extend core error types or create custom error codes for domain-specific failures. Required `recoverable` field ensures explicit retry behavior decisions.

7. **Cause chain preservation**: Original errors are captured in `cause` for debugging without losing the structured error type.

8. **Handler simplification**: Returning the data in a `result` field instead of the full `CommandExecutionResult` eliminates redundant `status: Success` and `JSON.stringify()`. This structure ensures extensibility while core handles serialization and maintains a flat output format.

## Consequences

### Positive

- **~50% code reduction** in handlers through boilerplate elimination (try-catch + status + stringify)
- **Consistent UX**: Same error format across all commands and plugins
- **Scriptable**: Stable error codes enable reliable automation
- **Debuggable**: Full error chain with `cause` preserved
- **Extensible**: Plugins can extend `CliError` while maintaining compatibility
- **Future-proof**: `recoverable` flag enables intelligent retry strategy

### Negative

- **Full migration required**: All handlers and services must be updated (no backwards compatibility path)
- **Learning curve**: Plugin developers must understand error type hierarchy

### Migration Impact

- **~47 files with catch blocks** must be refactored
- **~11 mirrornode service methods** need NetworkError/NotFoundError throwing
- **All handlers** switch from `return {status: Failure}` to `throw new XxxError()`
- **All handlers** change return type to updated `CommandExecutionResult<T>` (`{ result: T }`)
- **Core plugin-manager** must serialize handler results and handle output formatting
- **Tests** must verify error types instead of string matching

## Implementation Notes

### File Structure

```
src/core/errors/
├── index.ts                 # Re-exports all
├── error-code.ts            # ErrorCode enum + CLI_ERROR_EXIT_CODE
├── cli-error.ts             # CliError base class
├── validation-error.ts
├── not-found-error.ts
├── network-error.ts
├── authorization-error.ts
├── configuration-error.ts
├── transaction-error.ts
├── state-error.ts
└── file-error.ts
```

### Core Exports

```typescript
// src/core/index.ts
export * from './errors';
```

### Error Handler Modification

```typescript
// src/core/utils/error-handler.ts
export function formatAndExitWithError(
  error: unknown,
  format?: OutputFormat,
): never {
  if (error instanceof CliError) {
    console.log(formatCliErrorOutput(error, format));
    process.exit(CLI_ERROR_EXIT_CODE);
  }

  if (error instanceof ZodError) {
    const validationError = ValidationError.fromZod(error);
    console.log(formatCliErrorOutput(validationError, format));
    process.exit(CLI_ERROR_EXIT_CODE);
  }

  // Unknown error
  console.log(formatUnknownErrorOutput(error, format));
  process.exit(CLI_ERROR_EXIT_CODE);
}
```

## Alternatives Considered

### Result<T, E> pattern (Rust-style)

```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```

**Rejected**: Verbose syntax, TypeScript lacks pattern matching, requires signature changes across all handlers.

### Keep return-based errors with enhanced structure

**Rejected**: Does not eliminate boilerplate; handlers still need try-catch for service errors.

### Error codes as strings (not enum)

**Rejected**: Typo-prone, no IDE autocomplete, harder to maintain consistency.

## Testing Strategy

- **Unit tests**: Each error type instantiation, `toJSON()` output, error code values
- **Integration tests**: Handler throwing → Core catching → JSON output format
- **E2E tests**: `--format json` error output parsing, exit code verification
- **Plugin tests**: External plugin error extension and handling

## References

- ADR-003: Command Handler Result Contract (superseded error handling approach)
- oclif CLIError: Salesforce CLI error hierarchy inspiration
- AWS CLI error format: Structured JSON error output pattern
