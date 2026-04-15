# Error Handling Matrix

All `hcli` errors extend `CliError` with a typed `error` field, human-readable `message`, optional `context` object, and a `recoverable` boolean. When a command exits non-zero, parse the JSON error output and apply the recovery strategy below.

## Error types and recovery actions

| Error type                           | Recoverable | Agent recovery                                                                                                                                                                                     |
| ------------------------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ValidationError`                    | yes         | Fix parameters (wrong token ID, bad amount format, missing required option) and retry immediately. Do not retry more than once -- the fix must address the root cause.                             |
| `TransactionError` (recoverable)     | yes         | Retry with exponential backoff: 2s, 4s, 8s. Max 3 attempts. If still failing, alert user.                                                                                                          |
| `TransactionError` (non-recoverable) | no          | Log the error and transaction ID. Alert the user. Do not retry.                                                                                                                                    |
| `TransactionPrecheckError`           | depends     | Check balances and allowances. Common causes: insufficient HBAR for fees, missing token association, or expired transaction. Fix the underlying issue and retry once.                              |
| `NetworkError`                       | yes         | Transient connectivity issue. Retry with exponential backoff: 2s, 4s, 8s, 16s. Max 4 attempts.                                                                                                     |
| `NotFoundError`                      | yes         | Stale entity reference -- the token, account, schedule, or batch alias no longer exists. Refresh state: re-query via `hcli token view`, `hcli account balance`, etc. Re-resolve aliases and retry. |
| `AuthorizationError`                 | no          | Key mismatch or insufficient signing authority. Alert the user immediately -- likely requires a different key alias or multi-sig approval via `schedule`.                                          |
| `StateError`                         | no          | Corrupted local CLI state. Alert user. Alert user. Do not retry.                                                                                                                                   |
| `InternalError`                      | no          | Unexpected CLI bug. Log full error output. Alert user. Do not retry.                                                                                                                               |

## Recovery decision flow

1. Parse the `error` field from the JSON output.
2. If `recoverable` is `true`, apply the matching retry strategy from the table above.
3. If `recoverable` is `false`, stop immediately, log the error, and inform the user.
4. After exhausting retries, always inform the user with the error details and the failed command.

## Common scenarios

### Insufficient balance for swap

```json
{
  "error": "TransactionPrecheckError",
  "message": "INSUFFICIENT_PAYER_BALANCE",
  "context": { "accountId": "0.0.12345" },
  "recoverable": false
}
```

**Action:** Check `hcli account balance --account <alias> --format json`. If the account genuinely lacks funds, alert the user to top up or reduce trade size.

### Token not associated

```json
{
  "error": "TransactionPrecheckError",
  "message": "TOKEN_NOT_ASSOCIATED_TO_ACCOUNT",
  "context": { "tokenId": "0.0.456", "accountId": "0.0.789" },
  "recoverable": false
}
```

**Action:** Run `hcli token associate --token <tokenId> --account <alias> --format json`, then retry the original command.

### Schedule expired

```json
{
  "error": "NotFoundError",
  "message": "Schedule \"large-trade-001\" has expired",
  "context": { "scheduleName": "large-trade-001" },
  "recoverable": false
}
```

**Action:** The scheduled transaction expired before collecting enough signatures. Re-evaluate whether the trade is still desired. If yes, create a new schedule with a longer expiration window.

### Slippage exceeded

```json
{
  "error": "TransactionError",
  "message": "Swap output below minimum: slippage exceeded",
  "context": { "expected": "500", "received": "480" },
  "recoverable": true
}
```

**Action:** Market moved during execution. Options: increase slippage tolerance slightly (e.g. 0.5% -> 1.0%), reduce trade size, or wait for less volatile conditions. Retry with adjusted parameters.
