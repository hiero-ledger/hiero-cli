# SaucerSwap Plugin

Get swap quotes and execute real DEX trades on **SaucerSwap V2** (Hedera mainnet).

## Commands

### 1. `saucerswap quote` (read-only)

Get the expected output amount for an exact input swap. No transaction is sent.

```bash
hcli saucerswap quote --in HBAR --out 0.0.123456 --amount 10
hcli saucerswap quote -i 0.0.123456 -o HBAR -a 1
```

| Option     | Short | Required | Description                           |
| ---------- | ----- | -------- | ------------------------------------- |
| `--in`     | `-i`  | Yes      | Input: `HBAR` or token ID (0.0.x)     |
| `--out`    | `-o`  | Yes      | Output: `HBAR` or token ID (0.0.x)    |
| `--amount` | `-a`  | Yes      | Amount of input (e.g. `10` or `100t`) |

- **HBAR** in the path uses wrapped HBAR (WHBAR).
- **Amount**: without `t` = display units (e.g. 10 = 10 HBAR); with `t` = smallest unit (e.g. `100t` = 100 tinybar).

### 2. `saucerswap execute` (on-chain swap)

Execute a swap: **HBAR → token** or **token → HBAR**. Uses operator as signer and recipient.

```bash
hcli saucerswap execute --in HBAR --out 0.0.123456 --amount 10 --slippage 0.5
hcli saucerswap execute -i 0.0.123456 -o HBAR -a 100 -s 1
```

| Option       | Short | Required | Description                        |
| ------------ | ----- | -------- | ---------------------------------- |
| `--in`       | `-i`  | Yes      | Input: `HBAR` or token ID (0.0.x)  |
| `--out`      | `-o`  | Yes      | Output: `HBAR` or token ID (0.0.x) |
| `--amount`   | `-a`  | Yes      | Amount of input                    |
| `--slippage` | `-s`  | No       | Slippage % (default: 0.5)          |

- **HBAR → token**: Sends HBAR with the call (payable). No approval step.
- **Token → HBAR**: Approves the router for the input token, then calls `exactInput`.
- **Minimum output** is set from the quote minus slippage.

## Network

**Mainnet and testnet** are supported. The plugin uses the current network (or `--network`) to choose Quoter, Router, and WHBAR IDs. For testnet:

```bash
hcli network use -g testnet
hcli network set-operator -o <your-account>
```

Or override for a single run:

```bash
hcli saucerswap quote --in HBAR --out 0.0.123456 --amount 10 --network testnet
```

## Requirements

- Operator set for mainnet (ECDSA account with EVM address for execute).
- For **token → HBAR**: input must be an ERC-20–style contract (token ID resolvable to a contract with `approve`).
- Sufficient balance and gas for execute.

## How it works

- **Quote**: Calls SaucerSwap V2 Quoter contract (`quoteExactInput`) via mirror node (read-only). Path is built as `[tokenIn, fee, tokenOut]` with a 0.05% fee tier.
- **Execute**: For token in, approves the router then calls Router `exactInput` with path, recipient (operator EVM address), deadline, amount in, and minimum amount out (quote × (1 − slippage)). For HBAR in, the same router call is made with a payable amount.

## File layout

- `manifest.ts` – Plugin and command definitions.
- `constants.ts` – Quoter/router contract IDs, WHBAR, fee tier, ABIs.
- `utils/path-encoding.ts` – Encode swap path (token + fee + token) for V2.
- `commands/quote/` – Input schema, output schema + template, handler (quoter call).
- `commands/execute/` – Input schema, output schema + template, handler (approve + router call or payable router call).
