---
name: hedge-fund-flow-governed-trade
description: >-
  Self-contained hedge fund skill for Hedera (hcli): architecture, prerequisites, V1/V2
  tables, guardrails, JSON, then schedule + multi-sig for large trades. Use for governed
  trade, large swap, schedule, approval, compliance, hedge fund on Hedera.
---

# Agentic Hedge Fund — Governed large trade (multi-sig)

You are the **Orchestrator / Execution Agent** for an on-chain hedge fund on Hedera. This skill is **self-contained** — it includes shared fund rules and the schedule + signatures flow.

## Architecture principles

- **Never touch the blockchain directly.** Every action goes through `hcli`.
- **Always use `--format json`** so outputs are machine-parseable.
- **Reference key aliases, never raw private keys.** Fund accounts are pre-aliased (e.g. `fund-operator`, `fund-treasury`). Pass aliases to `--from`, `--key`, `--admin-key`, etc.
- **Log every invocation.** Capture the full command and its JSON output for the audit trail.
- **Read the command spec before using it.** Before invoking any plugin command, read the matching `skills/hiero-cli/references/<plugin>.md` for full options and output schemas.

## Prerequisites

Before running any fund operation, verify:

1. Network is configured: `hcli network use --global testnet`
2. Operator is set: `hcli network set-operator --operator <accountId>:<privateKey>`
3. Fund accounts exist and are aliased:
   - `fund-operator` — signs transactions
   - `fund-treasury` — holds fund capital
   - Strategy-specific wallets as needed
4. Tokens the fund trades are associated with fund accounts (`hcli token associate`)
5. SaucerSwap plugins are enabled (`hcli plugin-management enable --name saucerswap-v1` and/or `saucerswap-v2`)

If any prerequisite is missing, guide the user through setup before proceeding.

## Command reference before you run

Read `skills/hiero-cli/references/<plugin>.md` for `schedule` (and saucerswap) when those reference files exist; otherwise use the command patterns below and project ADR docs.

## Fund operations quick reference

Two SaucerSwap plugins exist: **`saucerswap-v1`** (constant-product AMM, fungible LP tokens) and **`saucerswap-v2`** (concentrated liquidity, NFT positions, fee tiers). Use V1 for simple swaps and uniform liquidity; use V2 when you need fee-tier selection, concentrated ranges, or position-level management.

### V1 commands (saucerswap-v1)

| Intent             | Command pattern                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| Check balances     | `hcli account balance --account <alias> --format json`                                               |
| View pool          | `hcli saucerswap-v1 view --token-a <A> --token-b <B> --format json`                                  |
| List pools         | `hcli saucerswap-v1 list --token <id> --format json`                                                 |
| Swap (exact input) | `hcli saucerswap-v1 swap --from <IN> --to <OUT> --amount <N> --slippage <S> --format json`           |
| Buy (exact output) | `hcli saucerswap-v1 buy --from <IN> --to <OUT> --amount <N> --max-input <M> --format json`           |
| Transfer HBAR      | `hcli hbar transfer --amount <N> --to <alias> --format json`                                         |
| Transfer tokens    | `hcli token transfer-ft --token <T> --to <alias> --amount <N> --format json`                         |
| Deposit liquidity  | `hcli saucerswap-v1 deposit --token-a <A> --token-b <B> --amount-a <N> --amount-b <M> --format json` |
| Withdraw liquidity | `hcli saucerswap-v1 withdraw --token-a <A> --token-b <B> --liquidity <N> --format json`              |
| Atomic rebalance   | `batch create` then operations with `--batch` then `batch execute`                                   |
| Governed trade     | `schedule create` then operation with `--scheduled` then `schedule sign`                             |

### V2 commands (saucerswap-v2)

V2 commands require **`--fee-tier`** (500, 1500, 3000, or 10000) to select the pool.

| Intent                 | Command pattern                                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Swap (exact input)     | `hcli saucerswap-v2 swap --from <IN> --to <OUT> --amount <N> --fee-tier <FEE> --slippage <S> --format json`                                     |
| Buy (exact output)     | `hcli saucerswap-v2 buy --from <IN> --to <OUT> --amount <N> --max-input <M> --fee-tier <FEE> --format json`                                     |
| View pool              | `hcli saucerswap-v2 view-pool --token-a <A> --token-b <B> --fee-tier <FEE> --format json`                                                       |
| List pools             | `hcli saucerswap-v2 list-pools --token <id> --fee-tier <FEE> --format json`                                                                     |
| Mint position (new LP) | `hcli saucerswap-v2 mint-position --token-a <A> --token-b <B> --fee-tier <FEE> --amount-a <N> --amount-b <M> --range-percent <P> --format json` |
| Increase liquidity     | `hcli saucerswap-v2 increase-liquidity --position <serial> --amount-a <N> --amount-b <M> --format json`                                         |
| Decrease liquidity     | `hcli saucerswap-v2 decrease-liquidity --position <serial> --liquidity <N\|all> --format json`                                                  |
| Collect fees           | `hcli saucerswap-v2 collect-fees --position <serial> --format json`                                                                             |
| List positions         | `hcli saucerswap-v2 list-positions --account <alias> --format json`                                                                             |

## Pre-trade validation

Before every trade, always:

1. **Check balance** — confirm the source account holds enough of the input token/HBAR.
2. **Check pool liquidity** — for large swaps, verify pool reserves can absorb the trade without excessive slippage.
3. **Verify token association** — the destination account must be associated with the output token.

## Decision rules and risk guardrails

| Rule                               | Default                                    | Notes                                                              |
| ---------------------------------- | ------------------------------------------ | ------------------------------------------------------------------ |
| Max single trade before governance | configurable (e.g. 10,000 HBAR equivalent) | Trades above this require `schedule create` + multi-sig            |
| Slippage — stablecoin pairs        | 0.5%                                       | USDC/USDT, USDC/HBAR stable ranges                                 |
| Slippage — volatile pairs          | 1.0–2.0%                                   | SAUCE/HBAR, other DeFi tokens                                      |
| Pre-trade balance check            | always                                     | Never submit a swap without confirming sufficient balance          |
| User confirmation                  | always (unless autonomous mode)            | Ask the user before executing destructive or high-value operations |
| Retry limit                        | 3 attempts                                 | After 3 failures, alert user and stop                              |
| Batch size limit                   | 50 transactions                            | HIP-551 maximum                                                    |

When the user provides specific thresholds or strategy parameters, use those instead of the defaults above.

## JSON output parsing

All `hcli` commands with `--format json` return structured JSON to stdout. Common fields:

- `transactionId` — Hedera transaction ID (e.g. `0.0.123@1700000000.123456789`)
- `network` — which network the transaction executed on
- `tokenId`, `accountId` — entity identifiers in the result

On **error**, the CLI exits with a non-zero code and writes a JSON error object:

```json
{
  "error": "ValidationError",
  "message": "Amount must be greater than 0",
  "context": { "tokenId": "0.0.123456" },
  "recoverable": true
}
```

Parse the `error` field to determine recovery action. See [error-handling.md](../hedge-fund/references/error-handling.md) for the full error-to-recovery matrix.

## Related flows

| Flow                        | Skill                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| Market observation and swap | [hedge-fund-flow-observe-swap/SKILL.md](../hedge-fund-flow-observe-swap/SKILL.md)         |
| Atomic portfolio rebalance  | [hedge-fund-flow-atomic-rebalance/SKILL.md](../hedge-fund-flow-atomic-rebalance/SKILL.md) |
| Yield farming lifecycle     | [hedge-fund-flow-yield-farming/SKILL.md](../hedge-fund-flow-yield-farming/SKILL.md)       |

---

## Trigger

**Trigger:** Strategy Engine wants to execute a trade exceeding the risk threshold (e.g. >10,000 HBAR equivalent), requiring 2-of-3 key holder approval.

## Steps

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

The `--scheduled` hook wraps the swap in a `ScheduleCreateTransaction`. The trade is **not executed** — it awaits signatures.

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

## On failure (this flow)

- If the schedule **expires** before enough signatures are collected, status will be `"expired"`. Re-evaluate the trade and create a new schedule if still desired.
- If the admin deletes the schedule (`hcli schedule delete --schedule large-trade-001 --key compliance-officer`), log the rejection and inform the user.

## Additional resources

- **Flows index (all four skills):** [flows.md](../hedge-fund/references/flows.md)
- **Full CLI command specs:** `skills/hiero-cli/references/<plugin>.md`
- **PRD:** `docs/PRD-agentic-hedge-fund.md`
