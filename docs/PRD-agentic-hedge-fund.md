# PRD: Agentic Hedge Fund — Hiero CLI Reference Demo Application

- **Status:** Draft
- **Date:** 2026-04-02
- **Owner:** Hiero CLI Team
- **Related ADRs:** ADR-001 (Plugin Architecture), ADR-010 (Batch Transactions), ADR-011 (Schedule Transactions), ADR-013 (SaucerSwap DEX Plugin — proposed)

---

## 1. Problem & Vision

### What Are We Demonstrating?

The Hiero CLI is a modular, plugin-based command-line interface for interacting with the Hedera network. It already supports account management, token operations, HBAR transfers, contract interaction, batch transactions, and scheduled transactions — all through a composable plugin architecture with structured JSON output.

With the addition of the **SaucerSwap DEX plugin** (ADR-013), the CLI gains the final building block needed to support DeFi operations: token swaps, liquidity management, and pool discovery.

The **Agentic Hedge Fund** is a reference demo application that answers the question:

> _"What if a hedge fund could run as a set of composable agents using CLI tools as their execution layer?"_

This demo demonstrates that:

1. **AI agents can be first-class actors** that interact with blockchain infrastructure through typed CLI commands
2. **The Hiero CLI plugin model is genuinely extensible** — adding a DEX plugin unlocks an entirely new class of applications
3. **Composability across plugins creates emergent capabilities** — batch atomicity, scheduled multi-sig governance, and DEX trading combine into a system that exceeds the sum of its parts
4. **On-chain actions are verifiable and auditable** — every agent action maps to a CLI invocation with structured input and output

### Why a Hedge Fund?

A hedge fund operating on-chain is a high-value, high-complexity scenario that exercises every layer of the CLI:

| Fund Operation         | CLI Capability                                                               |
| ---------------------- | ---------------------------------------------------------------------------- |
| Portfolio observation  | Mirror Node queries, `saucerswap list/view`, `token view`, `account balance` |
| Trade execution        | `saucerswap swap`, `saucerswap buy`, `hbar transfer`, `token transfer-ft`    |
| Liquidity provisioning | `saucerswap deposit`, `saucerswap withdraw`                                  |
| Atomic rebalancing     | `batch create` + multiple ops + `batch execute`                              |
| Multi-sig governance   | `schedule create` + `schedule sign` + `--scheduled` hook                     |
| Wallet management      | `account create`, `account balance`                                          |

No single plugin demo could showcase this breadth. A hedge fund scenario naturally touches all of them.

---

## 2. User Personas

### 2.1 Developer Exploring the Hiero CLI

**Profile:** A blockchain developer or DevOps engineer evaluating the Hiero CLI for their project. They want to understand the plugin model, see real command examples, and understand how plugins compose.

**Needs:**

- Clear mapping from business concepts (trade, rebalance) to CLI commands
- Runnable examples they can execute on testnet
- Understanding of plugin extensibility — how they could build their own agents or plugins

**How this demo serves them:** The Agentic Hedge Fund provides a complete, end-to-end reference that exercises 6+ plugins in concert. The developer can follow the example flows, modify strategies, and see how the CLI's modular design enables complex applications.

### 2.2 AI Agent (System Actor)

**Profile:** An autonomous or semi-autonomous software agent (LLM-based or algorithmic) that acts as a portfolio manager. It reads market state, decides on actions, and executes them through CLI commands.

**Needs:**

- Structured JSON output from every command (`--format json`)
- Predictable error types with machine-parseable codes
- Idempotent or safely retriable operations
- State persistence (agent can resume after restart)
- Clear separation: agent decides, CLI executes

**How this demo serves them:** The demo defines a clean interface contract — agents invoke CLI commands, parse JSON responses, and log decisions. The CLI handles signing, networking, retries, and state management.

### 2.3 Fund Administrator / Compliance Officer

**Profile:** A human who oversees the fund's operations, approves large trades, and reviews audit logs.

**Needs:**

- Multi-sig approval for large transactions (via scheduled transactions)
- Human-readable output for monitoring (`--format human`)
- Audit trail of all agent actions
- Ability to pause/override agent decisions

**How this demo serves them:** The scheduled transaction flow demonstrates governance. The admin can review pending schedules (`schedule verify`), add their signature (`schedule sign`), or reject (`schedule delete`).

---

## 3. System Overview

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AGENT LAYER (Strategy)                       │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │   Market     │  │  Strategy    │  │  Risk /      │               │
│  │   Observer   │  │  Engine      │  │  Compliance  │               │
│  │   Agent      │  │  Agent       │  │  Agent       │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                 │                 │                       │
│  ┌──────▼─────────────────▼─────────────────▼─────────────────────┐ │
│  │              ORCHESTRATOR / EXECUTION AGENT                    │ │
│  │  (translates intents → CLI commands, manages retries/logging)  │ │
│  └──────────────────────────┬─────────────────────────────────────┘ │
└─────────────────────────────┼───────────────────────────────────────┘
                              │  JSON stdin/stdout
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     CLI EXECUTION LAYER                             │
│                                                                     │
│  ┌──────────┬──────────┬──────────┬──────────┬─────────┬─────────┐  │
│  │saucerswap│  token   │   hbar   │ schedule │  batch  │ account │  │
│  │  plugin  │  plugin  │  plugin  │  plugin  │  plugin │  plugin │  │
│  └──────────┴──────────┴──────────┴──────────┴─────────┴─────────┘  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      Core API Services                         │ │
│  │  KeyResolver │ KMS │ MirrorNode │ TxSign │ TxExecute │ State   │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     BLOCKCHAIN LAYER                                │
│                                                                     │
│    Hedera Network (testnet / mainnet)                               │
│    ┌────────────┐  ┌────────────────┐  ┌──────────────────────┐     │
│    │ Consensus  │  │  Mirror Node   │  │ SaucerSwap Contracts │     │
│    │  Nodes     │  │  REST API      │  │ (Router / Factory)   │     │
│    └────────────┘  └────────────────┘  └──────────────────────┘     │
│                                         ┌──────────────────────┐    │
│                                         │ SaucerSwap REST API  │    │
│                                         │ (pool data / prices) │    │
│                                         └──────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer                   | Responsibility                                                                              | Technology                                                |
| ----------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Agent Layer**         | Observe market, decide strategy, enforce risk rules                                         | Python/TypeScript scripts, LLM, or algorithmic strategies |
| **CLI Execution Layer** | Parse commands, resolve keys, build/sign/execute transactions, persist state, format output | Hiero CLI (Node.js, Zod, Zustand, Hedera SDK)             |
| **Blockchain Layer**    | Consensus, state, smart contracts, historical data                                          | Hedera network, Mirror Node, SaucerSwap protocol          |

The critical design principle: **agents never interact with the blockchain directly**. They only interact with the CLI. This provides:

- **Security**: agents reference key aliases, never raw private keys, used keys can be enforced to be encrypted
- **Auditability**: every action is a logged CLI invocation
- **Testability**: agents can be tested against CLI output mocks
- **Portability**: swap the agent framework (LLM, rule engine, RL model) without changing the execution layer

---

## 4. Core Features

### 4.1 Wallet & Account Management

Agents manage fund accounts through the `account` plugin.

| Capability               | Command           | Notes                                         |
| ------------------------ | ----------------- | --------------------------------------------- |
| Create fund accounts     | `account create`  | Operator, treasury, strategy-specific wallets |
| Check balances           | `account balance` | HBAR + token balances via Mirror Node         |
| List managed accounts    | `account list`    | All locally tracked accounts                  |
| Import existing accounts | `account import`  | Bring in pre-existing fund wallets            |
| View account details     | `account view`    | On-chain account state                        |

**Agent pattern:** The orchestrator agent creates dedicated accounts per strategy (isolation) and monitors balances to trigger rebalances.

### 4.2 Market Observation

Agents read DEX and token state through read-only commands.

| Capability             | Command                                       | Notes                      |
| ---------------------- | --------------------------------------------- | -------------------------- |
| List liquidity pools   | `saucerswap list --token <id>`                | All pools for a token      |
| View pool details      | `saucerswap view --token-a <A> --token-b <B>` | Reserves, price, TVL       |
| Token information      | `token view --token <id>`                     | Decimals, supply, metadata |
| Account token balances | `account balance --account <id>`              | Current holdings           |

**Agent pattern:** The Market Observer agent polls these commands on an interval, builds a local price/liquidity model, and publishes snapshots to the Strategy Engine.

### 4.3 Trade Execution

Agents execute swaps, transfers, and liquidity operations.

| Capability       | Command             | Notes                                 |
| ---------------- | ------------------- | ------------------------------------- |
| Swap tokens      | `saucerswap swap`   | Exact-input swaps with slippage       |
| Buy exact amount | `saucerswap buy`    | Exact-output swaps                    |
| Transfer HBAR    | `hbar transfer`     | Native currency movement              |
| Transfer tokens  | `token transfer-ft` | Fungible token movement               |
| Associate tokens | `token associate`   | Required before receiving a new token |

**Agent pattern:** The Execution Agent translates Strategy Engine intents ("buy 1000 USDC with HBAR") into specific CLI commands with calculated slippage and deadline parameters.

### 4.4 Liquidity Management

Agents provide and withdraw liquidity to earn fees.

| Capability         | Command               | Notes                |
| ------------------ | --------------------- | -------------------- |
| Deposit liquidity  | `saucerswap deposit`  | Add to existing pool |
| Withdraw liquidity | `saucerswap withdraw` | Remove from pool     |

**Agent pattern:** A yield-farming strategy that allocates capital to high-fee pools, rebalances based on impermanent loss calculations, and withdraws when APY drops below a threshold.

### 4.5 Atomic Batch Operations (Rebalancing)

The `batch` plugin enables atomic, multi-step portfolio rebalancing.

| Capability         | Command                                     | Notes                                |
| ------------------ | ------------------------------------------- | ------------------------------------ |
| Create batch       | `batch create --name <name> --key <signer>` | Group of transactions                |
| Add operations     | Any command with `--batch <name>`           | Defer execution                      |
| Execute atomically | `batch execute --name <name>`               | All-or-nothing (HIP-551, max 50 txs) |
| Review pending     | `batch list`                                | See batches before execution         |
| Cancel             | `batch delete --name <name>`                | Discard the batch                    |

**Agent pattern — atomic rebalance:**

```bash
hcli batch create --name rebalance-42 --key fund-operator
hcli saucerswap withdraw --token-a USDC --token-b HBAR --liquidity 50 --batch rebalance-42
hcli saucerswap swap --token-in HBAR --token-out SAUCE --amount-in 200 --batch rebalance-42
hcli saucerswap deposit --token-a SAUCE --token-b USDC --amount-a 200 --batch rebalance-42
hcli batch execute --name rebalance-42
```

If any step fails, the entire rebalance reverts. No partial-fill risk.
Need to remember that transactions in the batch must be independent of each other.

### 4.6 Multi-Sig Governance (Scheduled Transactions)

The `schedule` plugin provides deferred, multi-party approval for high-value operations.

| Capability                 | Command                               | Notes                                 |
| -------------------------- | ------------------------------------- | ------------------------------------- |
| Define schedule parameters | `schedule create`                     | Admin key, payer, expiration, memo    |
| Schedule a transaction     | Any command with `--scheduled <name>` | Defers to `ScheduleCreateTransaction` |
| Add signatures             | `schedule sign`                       | Additional key holders approve        |
| Check status               | `schedule verify`                     | Mirror Node execution/deletion state  |
| Reject                     | `schedule delete`                     | Admin cancels the schedule            |

**Agent pattern — large trade approval:**

```bash
# Risk agent defers a large trade
hcli schedule create --name large-swap --admin-key compliance-officer \
    --expiration "2026-04-03T18:00:00.000+02:00"
hcli saucerswap swap --token-in HBAR --token-out USDC --amount-in 50000 \
    --slippage 1.0 --scheduled large-swap

# Human fund managers approve
hcli schedule sign --schedule large-swap --key portfolio-manager
hcli schedule sign --schedule large-swap --key risk-officer

# Anyone can verify execution
hcli schedule verify --name large-swap
```

---

## 5. Example Flows

### Flow 1: Agent Observes Market and Executes a Swap

**Trigger:** Market Observer detects HBAR/USDC price dip below moving average.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Market    │     │   Strategy   │     │  Execution   │
│   Observer   │────▶│    Engine    │────▶│    Agent     │
│              │     │              │     │              │
│ saucerswap   │     │ "Buy 500     │     │ saucerswap   │
│ view → JSON  │     │  USDC with   │     │ swap →       │
│              │     │  HBAR"       │     │ JSON result  │
└──────────────┘     └──────────────┘     └──────────────┘
```

**Step-by-step:**

1. **Market Observer** runs:

   ```bash
   hcli saucerswap view --token-a HBAR --token-b USDC --format json
   ```

   Parses JSON: `{ "reserveA": "...", "reserveB": "...", "price": "0.082", ... }`

2. **Strategy Engine** receives the price snapshot, compares against its 24h moving average, and emits intent:

   ```json
   {
     "action": "swap",
     "tokenIn": "HBAR",
     "tokenOut": "USDC",
     "amountIn": 5000,
     "slippage": 0.5
   }
   ```

3. **Risk Agent** validates:
   - Position size within limits (checks `account balance --format json`)
   - Slippage is acceptable given pool liquidity
   - Approves the intent

4. **Execution Agent** runs:

   ```bash
   hcli saucerswap swap --token-in HBAR --token-out USDC \
       --amount-in 5000 --slippage 0.5 --format json
   ```

5. **Execution Agent** logs the JSON result (transaction ID, amounts, network) to the audit trail.

### Flow 2: Atomic Portfolio Rebalance

**Trigger:** Strategy Engine determines the portfolio is overweight HBAR and underweight SAUCE/USDC LP.

**Step-by-step:**

1. **Execution Agent** creates a batch:

   ```bash
   hcli batch create --name rebalance-2026-04-02 --key fund-operator --format json
   ```

2. **Execution Agent** adds operations:

   ```bash
   hcli token transfer-ft --token USDC --from fund-treasury --to fund-operator \
       --amount 1000 --batch rebalance-2026-04-02

   hcli saucerswap swap --token-in HBAR --token-out SAUCE \
       --amount-in 2000 --slippage 1.0 --batch rebalance-2026-04-02

   hcli saucerswap deposit --token-a SAUCE --token-b USDC \
       --amount-a 500 --amount-b 1000 --slippage 2.0 --batch rebalance-2026-04-02
   ```

3. **Execution Agent** executes atomically:

   ```bash
   hcli batch execute --name rebalance-2026-04-02 --format json
   ```

   All three operations succeed or none do.

4. **Results** are logged: transaction ID, success status, post-execution balances queried via `account balance`.

### Flow 3: Governed Large Trade with Multi-Sig Approval

**Trigger:** Strategy Engine wants to execute a trade exceeding the $10,000 threshold, which requires 2-of-3 key holder approval.

**Step-by-step:**

1. **Risk Agent** creates a governed schedule:

   ```bash
   hcli schedule create --name large-trade-001 \
       --admin-key compliance-officer \
       --expiration "2026-04-03T18:00:00.000+02:00" \
       --memo "Large HBAR→USDC swap requiring approval" \
       --format json
   ```

2. **Execution Agent** attaches the trade to the schedule:

   ```bash
   hcli saucerswap swap --token-in HBAR --token-out USDC \
       --amount-in 50000 --slippage 1.0 \
       --scheduled large-trade-001
   ```

   The `--scheduled` hook wraps the swap in a `ScheduleCreateTransaction`. The trade is **not executed** — it awaits signatures.

3. **Notification** is sent to key holders (out-of-band: email, Slack, dashboard).

4. **Key holders sign:**

   ```bash
   # Portfolio manager approves
   hcli schedule sign --schedule large-trade-001 --key portfolio-manager

   # Risk officer approves
   hcli schedule sign --schedule large-trade-001 --key risk-officer
   ```

   Once the required threshold of signatures is met, Hedera automatically executes the scheduled transaction.

5. **Verification:**
   ```bash
   hcli schedule verify --name large-trade-001 --format json
   ```
   Returns execution status, transaction ID, and whether the schedule was executed or expired.

### Flow 4: Yield Farming Lifecycle

**Trigger:** Strategy Engine identifies a high-APY liquidity pool.

**Step-by-step:**

1. **Discovery:**

   ```bash
   hcli saucerswap list --token SAUCE --format json
   ```

   Returns all pools with SAUCE, including reserves and implied APY data.

2. **Deposit:**

   ```bash
   hcli saucerswap deposit --token-a SAUCE --token-b USDC \
       --amount-a 1000 --amount-b 500 --slippage 2.0 --format json
   ```

3. **Monitoring (periodic):**

   ```bash
   hcli saucerswap view --token-a SAUCE --token-b USDC --format json
   hcli account balance --account fund-operator --format json
   ```

   The agent tracks impermanent loss vs. fee income.

4. **Withdrawal (when IL exceeds threshold):**
   ```bash
   hcli saucerswap withdraw --token-a SAUCE --token-b USDC \
       --liquidity 100 --slippage 2.0 --format json
   ```

---

## 6. Architecture Mapping to the Hiero CLI

### 6.1 Plugin Model Usage

The Agentic Hedge Fund uses the following plugins from the Hiero CLI:

| Plugin                 | Role in the Fund                                                        | Commands Used                                        |
| ---------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------- |
| **account**            | Wallet management: create fund accounts, check balances, import wallets | `create`, `balance`, `list`, `import`, `view`        |
| **hbar**               | Native currency transfers between fund accounts                         | `transfer`                                           |
| **token**              | Token transfers, association, metadata queries                          | `transfer-ft`, `associate`, `view`, `list`           |
| **saucerswap** _(new)_ | DEX operations: swaps, liquidity, pool queries                          | `swap`, `buy`, `deposit`, `withdraw`, `list`, `view` |
| **batch**              | Atomic multi-operation rebalancing                                      | `create`, `execute`, `list`, `delete`                |
| **schedule**           | Multi-sig governance for large trades                                   | `create`, `sign`, `delete`, `verify`                 |

### 6.2 Core API Services Leveraged

Each CLI command handler receives `CoreApi` via dependency injection. The fund leverages:

| Service                              | Usage                                                                         |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| `api.keyResolver`                    | Resolve agent key aliases → signing credentials without exposing private keys |
| `api.kms`                            | Encrypted key storage (`local_encrypted` key manager for production)          |
| `api.mirror`                         | Read account info, token info, scheduled transaction state from Mirror Node   |
| `api.txSign` / `api.txExecute`       | Build, sign, and submit Hedera transactions                                   |
| `api.state`                          | Persist fund state: batch definitions, schedule records, plugin-specific data |
| `api.network`                        | Network resolution (testnet for dev, mainnet for production)                  |
| `api.config`                         | Runtime options (key manager type, log level, skip confirmations)             |
| `api.schedule`                       | Build `ScheduleCreate`, `ScheduleSign`, `ScheduleDelete` transactions         |
| `api.batch`                          | Build atomic `BatchTransaction` from collected transaction bytes              |
| `api.contract` / `api.contractQuery` | Direct smart contract interaction (SaucerSwap Router/Factory)                 |
| `api.identityResolution`             | Resolve token/account references to entity IDs and EVM addresses              |

### 6.3 Hook System Integration

The fund relies on two hooks:

**`batchify` hook** (from `batch` plugin):

- Injected via `--batch <name>` on any supported command
- Intercepts at `preExecuteTransactionHook`: serializes the signed transaction, adds it to batch state, returns `breakFlow: true`
- Enables atomic rebalancing (Flow 2)

**`scheduled` hook** (from `schedule` plugin):

- Injected via `--scheduled <name>` on any supported command
- Intercepts at `preSignTransactionHook`: wraps the inner transaction in `ScheduleCreateTransaction`, signs with admin/payer keys, executes once, returns `breakFlow: true`
- Enables governed trading (Flow 3)

Both hooks follow the same architectural pattern: they declare options in their plugin manifest, commands opt in via `registeredHooks`, and the CLI framework merges the hook options and runs the hook lifecycle automatically. **No agent code changes are needed to use batch or scheduled modes** — the agent simply adds `--batch` or `--scheduled` to its existing commands.

### 6.4 Extensibility Points

The plugin architecture enables future fund capabilities without modifying existing code:

| Extension                                       | How                                                                                |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| **New DEX protocol** (e.g., Pangolin, HeliSwap) | New plugin, same command patterns as SaucerSwap                                    |
| **Lending/borrowing**                           | New plugin with `deposit`, `borrow`, `repay` commands                              |
| **Oracle price feeds**                          | New plugin wrapping oracle contract reads                                          |
| **Staking**                                     | New plugin for native HBAR staking or liquid staking protocols                     |
| **Custom strategy hooks**                       | New hook that intercepts commands for strategy-specific logic (e.g., auto-hedging) |
| **Notification plugin**                         | Post-output hook that sends Slack/email on trade execution                         |
| **Portfolio analytics**                         | Read-only plugin that aggregates state across plugins and outputs reports          |

Each extension follows the same pattern: publish a `PluginManifest`, implement command handlers that receive `CoreApi`, and optionally define hooks. The fund's agent layer doesn't change — it just gets new CLI commands to invoke.

### 6.5 Output Contract

All commands return `CommandResult`:

```typescript
interface CommandResult {
  result: object; // Zod-validated structured output
  overrideSchema?: ZodType; // Optional schema override (hook short-circuits)
  overrideHumanTemplate?: string;
}
```

The CLI formats output based on `--format`:

- **`json`** (agent consumption): raw JSON of the `result` object, machine-parseable
- **`human`** (admin monitoring): Handlebars template rendering with hashscan links, emoji status indicators

Agents always use `--format json`. Administrators use default human output or dashboards fed by JSON.

### 6.6 Error Handling Contract

All errors extend `CliError` with a typed `code`, optional `context`, and `recoverable` flag:

| Error Type                           | Agent Response                               |
| ------------------------------------ | -------------------------------------------- |
| `ValidationError`                    | Fix parameters and retry                     |
| `TransactionError` (recoverable)     | Retry with backoff                           |
| `TransactionError` (non-recoverable) | Log, alert, skip                             |
| `TransactionPrecheckError`           | Check balances/allowances, adjust parameters |
| `NetworkError`                       | Retry with exponential backoff               |
| `NotFoundError`                      | Stale reference — refresh state              |
| `AuthorizationError`                 | Key mismatch — escalate to admin             |
| `StateError`                         | Corrupted local state — reset and reimport   |

The Execution Agent parses the exit code and JSON error output to decide on retries vs. escalation.

---

## 7. Scope & Boundaries

### In Scope (Demo v1)

- [ ] **Agent scripts** (TypeScript or Python) implementing the four flows described above
- [ ] **SaucerSwap plugin** implementation (ADR-013) with `swap`, `buy`, `list`, `view`, `deposit`, `withdraw`, `create-pool` commands
- [ ] **Example strategy**: simple mean-reversion or rebalancing strategy
- [ ] **Testnet deployment**: all demo operations on Hedera testnet
- [ ] **Audit logging**: agent logs every CLI invocation with input/output to a local file
- [ ] **README / walkthrough**: step-by-step guide to run the demo
- [ ] **Docker compose** or equivalent for easy local setup (CLI + agent)

### Out of Scope (v1)

- Production-grade AI/ML strategy (demo uses rule-based or simple logic)
- Real funds or mainnet deployment
- Frontend dashboard (agents are CLI-only for v1)
- Advanced risk models (demo uses simple threshold checks)
- Hot-reload or live agent management
- Cross-chain operations
- MEV protection beyond slippage settings

---

## 8. Technical Requirements

### 8.1 SaucerSwap Plugin (Prerequisite)

The SaucerSwap DEX plugin must be implemented per the proposed ADR-013 design:

| Command               | Contract Function                        | Notes                        |
| --------------------- | ---------------------------------------- | ---------------------------- |
| `saucerswap swap`     | `swapExact*For*` variants                | HBAR/token routing via WHBAR |
| `saucerswap buy`      | `swap*ForExact*` variants                | Exact-output swaps           |
| `saucerswap deposit`  | `addLiquidity` / `addLiquidityETH`       | With new-pool detection      |
| `saucerswap withdraw` | `removeLiquidity` / `removeLiquidityETH` | LP token burn                |
| `saucerswap list`     | SaucerSwap REST API                      | Pool discovery               |
| `saucerswap view`     | SaucerSwap REST API                      | Pool details                 |

Must register `batchify` and `scheduled` hooks on transactional commands.

### 8.2 Agent Framework

- Language: TypeScript (preferred, for type sharing with CLI)
- Communication: shell invocation of `hcli` binary with `--format json`, parse stdout
- Concurrency: single-agent execution per strategy (no concurrent state mutations on same batch/schedule)
- Configuration: environment variables or config file for strategy parameters (thresholds, intervals, slippage defaults)

### 8.3 State & Persistence

- CLI state persists in `~/.hiero-cli/state/` (Zustand file-backed stores)
- Agent decision logs persist in a configurable directory
- Each agent run is idempotent or safely resumable (check state before acting)

### 8.4 Testing Strategy

| Level           | What                           | How                                         |
| --------------- | ------------------------------ | ------------------------------------------- |
| **Unit**        | Individual CLI plugin commands | Jest mocks for CoreApi (existing patterns)  |
| **Integration** | Agent → CLI → testnet          | End-to-end scripts on Hedera testnet        |
| **Strategy**    | Agent decision logic           | Unit tests with mocked market data          |
| **Demo**        | Full walkthrough               | Scripted scenario on testnet with seed data |

---

## 9. Success Criteria

1. **End-to-end demo runs on testnet** with at least the four flows described in Section 5
2. **All CLI invocations use `--format json`** and agents successfully parse every response
3. **Atomic rebalance** (Flow 2) demonstrates that a multi-step portfolio change either fully succeeds or fully reverts
4. **Multi-sig governance** (Flow 3) demonstrates that a large trade requires multiple human approvals before execution
5. **No private keys are exposed** to agent code — all signing uses key aliases resolved by the CLI
6. **A new developer can run the demo** in under 15 minutes using the provided README
7. **The demo showcases at least 6 plugins** working together in a single scenario

---

## 10. Glossary

| Term                    | Definition                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| **Agent**               | An autonomous software component that makes decisions and invokes CLI commands                 |
| **Orchestrator**        | The top-level agent that coordinates sub-agents and translates intents to CLI calls            |
| **Intent**              | A high-level action description (e.g., "swap 500 HBAR to USDC") emitted by the Strategy Engine |
| **CLI Execution Layer** | The Hiero CLI and its plugins, acting as the bridge between agents and the blockchain          |
| **Batch**               | A group of transactions executed atomically via `batch create` + `batch execute` (HIP-551)     |
| **Schedule**            | A deferred transaction requiring multi-party signatures before execution                       |
| **Slippage**            | Maximum acceptable price deviation for DEX operations                                          |
| **LP Token**            | Liquidity Provider token received when depositing into a DEX pool                              |
| **WHBAR**               | Wrapped HBAR (ERC-20 representation used by SaucerSwap for HBAR pairs)                         |
| **Mirror Node**         | Hedera's read-only API for historical and current chain state                                  |
| **CoreApi**             | The dependency-injected service container available to all CLI command handlers                |
