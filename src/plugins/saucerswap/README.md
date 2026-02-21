# SaucerSwap Plugin

Get swap quotes and execute real DEX trades on **SaucerSwap V2** (Hedera mainnet and testnet).

## Running the CLI

If you're not using a globally installed `hcli`, run commands with:

```bash
node dist/hiero-cli.js <command> ...
```

Examples below use `hcli`; replace with `node dist/hiero-cli.js` if needed.

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
- **HBAR → WHBAR** (wrap): Uses WhbarHelper `deposit()`; 1:1. **Associate the WHBAR token with your operator account first** (e.g. `hcli token associate …`) or the call will fail with `TOKEN_NOT_ASSOCIATED_TO_ACCOUNT`.
- **Token → HBAR**: Approves the router for the input token, then calls `exactInput`.
- **Minimum output** is set from the quote minus slippage.

## Network

**Only mainnet and testnet** are supported (previewnet/localnet are not). The plugin uses the current network or the global `--network` flag. For testnet you must either set the default network or pass `--network testnet` on every run.

**Option 1 – Set default network to testnet:**

```bash
hcli network use -g testnet
hcli network set-operator -o <operator>
hcli saucerswap quote --in HBAR --out 0.0.123456 --amount 10
```

**Setting the operator:** You cannot pass only an account ID (e.g. `0.0.7982140`). Use either:

- **Account alias** (if the account was imported): `hcli network set-operator -o my-operator --network testnet`
- **Account ID and private key**: `hcli network set-operator -o 0.0.7982140:302e020100300506032b657004220420... --network testnet`

If you see _Alias name must contain only letters..._, you passed an account ID only; use the `accountId:privateKey` format or import the account and use its alias.

**Option 2 – Override for a single run:**

```bash
hcli saucerswap quote --in HBAR --out 0.0.123456 --amount 10 --network testnet
```

If you see _"SaucerSwap is only supported on mainnet and testnet"_, use `--network testnet` or `--network mainnet` explicitly.

## Requirements

- Operator set for mainnet (ECDSA account with EVM address for execute).
- For **token → HBAR**: input must be an ERC-20–style contract (token ID resolvable to a contract with `approve`).
- Sufficient balance and gas for execute.

## Testing on testnet

1. **Set network and operator:**

   ```bash
   hcli --network testnet saucerswap quote --in HBAR --out 0.0.15058 --amount 1
   ```

   (0.0.15058 is WHBAR on testnet; this quotes HBAR → WHBAR wrap, 1:1.)

2. **Quote HBAR → token (e.g. WHBAR):**

   ```bash
   hcli saucerswap quote --in HBAR --out 0.0.15058 --amount 1 --network testnet
   ```

3. **Quote token → HBAR (e.g. WHBAR → HBAR):**

   ```bash
   hcli saucerswap quote --in 0.0.15058 --out HBAR --amount 1 --network testnet
   ```

4. **Execute (requires operator with ECDSA and testnet HBAR):**
   ```bash
   # Use an alias (e.g. after: hcli account import -n my-operator ...) or accountId:privateKey
   node dist/hiero-cli.js network set-operator -o my-operator --network testnet
   node dist/hiero-cli.js saucerswap execute --in HBAR --out 0.0.15058 --amount 1 --network testnet
   ```

If quote fails with _"Contract not found"_ or mirror errors, ensure you are using `--network testnet` and that the CLI default network is not previewnet/localnet.

## How it works

- **Quote**: Calls SaucerSwap V2 Quoter contract (`quoteExactInput`) via mirror node (read-only). Path is built as `[tokenIn, fee, tokenOut]` with a 0.05% fee tier.
- **Execute**: For **HBAR → WHBAR** (same in/out), calls WhbarHelper `deposit()` with payable HBAR. For other **HBAR → token**, calls Router `exactInput` with payable amount. For **token → HBAR**, approves the router then calls Router `exactInput` with path, recipient, deadline, amount in, and minimum amount out (quote × (1 − slippage)).

## File layout

- `manifest.ts` – Plugin and command definitions.
- `constants.ts` – Quoter/router contract IDs, WHBAR, fee tier, ABIs.
- `utils/path-encoding.ts` – Encode swap path (token + fee + token) for V2.
- `commands/quote/` – Input schema, output schema + template, handler (quoter call).
- `commands/execute/` – Input schema, output schema + template, handler (approve + router call or payable router call).
