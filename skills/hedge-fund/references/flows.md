# Canonical Fund Flows

Four end-to-end runbooks the agent follows. Each flow lists a trigger, step-by-step commands, expected output shapes, and failure handling.

---

## Flow 1: Market observation and swap execution

**Trigger:** Market Observer detects a price dip below a moving average or strategy threshold.

### Steps

**1. Query pool price**

```bash
hcli saucerswap-v1 view --token-a HBAR --token-b USDC --format json
```

Expected output (relevant fields):

```json
{
  "tokenA": "HBAR",
  "tokenB": "USDC",
  "reserveA": "5000000",
  "reserveB": "410000",
  "price": "0.082",
  "poolId": "0.0.999999"
}
```

Parse `price` and compare against the strategy threshold.

**2. Check fund balance**

```bash
hcli account balance --account fund-treasury --format json
```

Verify the treasury holds enough HBAR (or the input token) for the intended trade size.

**3. Execute the swap**

```bash
hcli saucerswap-v1 swap --from HBAR --to USDC \
    --amount 5000 --slippage 0.5 --format json
```

Expected output:

```json
{
  "transactionId": "0.0.123@1700000000.123456789",
  "tokenIn": "HBAR",
  "tokenOut": "USDC",
  "amountIn": "5000",
  "amountOut": "410",
  "network": "testnet"
}
```

**4. Log result**

Record the full command, JSON output, price snapshot, and strategy rationale.

### On failure

- `ValidationError` -- fix parameters (wrong token ID, bad amount format) and retry.
- `TransactionError` (recoverable) -- retry up to 3 times with backoff.
- Insufficient balance -- alert user; do not retry.

---

## Flow 2: Atomic portfolio rebalance

**Trigger:** Strategy Engine determines the portfolio is overweight in one asset and underweight in another.

### Steps

**1. Create batch**

```bash
hcli batch create --name rebalance-2026-04-15 --key fund-operator --format json
```

**2. Queue operations**

```bash
hcli token transfer-ft --token USDC --from fund-treasury --to fund-operator \
    --amount 1000 --batch rebalance-2026-04-15

hcli saucerswap-v1 swap --from HBAR --to SAUCE \
    --amount 2000 --slippage 1.0 --batch rebalance-2026-04-15

hcli saucerswap-v1 deposit --token-a SAUCE --token-b USDC \
    --amount-a 500 --amount-b 1000 --batch rebalance-2026-04-15
```

Each command returns confirmation that the transaction was queued (not executed).

**3. Review batch (optional)**

```bash
hcli batch list --format json
```

Verify the batch contains the expected number of transactions.

**4. Execute atomically**

```bash
hcli batch execute --name rebalance-2026-04-15 --format json
```

Expected output:

```json
{
  "batchName": "rebalance-2026-04-15",
  "transactionsExecuted": 3,
  "transactionIds": [
    "0.0.123@1700000001.000000000",
    "0.0.123@1700000002.000000000",
    "0.0.123@1700000003.000000000"
  ]
}
```

**5. Verify post-rebalance balances**

```bash
hcli account balance --account fund-operator --format json
hcli account balance --account fund-treasury --format json
```

### On failure

- If `batch execute` fails, **all operations revert** -- no partial fills. Check the error, fix the failing transaction, and recreate the batch.
- Use `hcli batch delete --name rebalance-2026-04-15` to clean up a failed or abandoned batch.

---

## Flow 3: Governed large trade with multi-sig approval

**Trigger:** Strategy Engine wants to execute a trade exceeding the risk threshold (e.g. >10,000 HBAR equivalent), requiring 2-of-3 key holder approval.

### Steps

**1. Create a governed schedule**

```bash
hcli schedule create --name large-trade-001 \
    --admin-key compliance-officer \
    --expiration "2026-04-16T18:00:00.000+02:00" \
    --memo "Large HBAR->USDC swap requiring approval" \
    --format json
```

**2. Attach the trade to the schedule**

```bash
hcli saucerswap-v1 swap --from HBAR --to USDC \
    --amount 50000 --slippage 1.0 \
    --scheduled large-trade-001
```

The `--scheduled` hook wraps the swap in a `ScheduleCreateTransaction`. The trade is **not executed** -- it awaits signatures.

**3. Notify key holders**

Out-of-band: email, Slack, or dashboard notification. The agent should inform the user that approvals are needed.

**4. Key holders sign**

```bash
hcli schedule sign --schedule large-trade-001 --key portfolio-manager
hcli schedule sign --schedule large-trade-001 --key risk-officer
```

Once the required signature threshold is met, Hedera auto-executes the scheduled transaction.

**5. Verify execution**

```bash
hcli schedule verify --name large-trade-001 --format json
```

Expected output:

```json
{
  "scheduleName": "large-trade-001",
  "status": "executed",
  "transactionId": "0.0.123@1700000000.123456789",
  "signaturesCollected": 2,
  "signaturesRequired": 2
}
```

### On failure

- If the schedule **expires** before enough signatures are collected, status will be `"expired"`. Re-evaluate the trade and create a new schedule if still desired.
- If the admin deletes the schedule (`hcli schedule delete --schedule large-trade-001 --key compliance-officer`), log the rejection and inform the user.

---

## Flow 4: Yield farming lifecycle

**Trigger:** Strategy Engine identifies a high-APY liquidity pool.

### Steps

**1. Discover pools**

```bash
hcli saucerswap-v1 list --token SAUCE --format json
```

Returns all pools containing SAUCE with reserves and implied APY data. Select the pool with the best risk/reward profile.

**2. Deposit liquidity**

```bash
hcli saucerswap-v1 deposit --token-a SAUCE --token-b USDC \
    --amount-a 1000 --amount-b 500 --format json
```

Expected output includes LP token amount received.

**3. Monitor (periodic)**

On each polling interval:

```bash
hcli saucerswap-v1 view --token-a SAUCE --token-b USDC --format json
hcli account balance --account fund-operator --format json
```

Track:

- Current pool reserves and price ratio vs. entry ratio (to compute impermanent loss)
- LP token balance in the fund account
- Fee income accrued (if available from pool data)

**4. Withdraw when IL exceeds threshold**

```bash
hcli saucerswap-v1 withdraw --token-a SAUCE --token-b USDC \
    --liquidity 100 --format json
```

### On failure

- Deposit or withdrawal `TransactionError` -- retry with backoff. If slippage error, increase slippage tolerance slightly and retry.
- If the pool is depleted or removed, log the event and alert the user.
