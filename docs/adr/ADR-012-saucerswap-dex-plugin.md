### ADR-012: SaucerSwap DEX Plugin

- Status: Proposed
- Date: 2026-04-01
- Related: `src/plugins/saucerswap/*`, `src/core/services/contract-transaction/*`, `src/core/services/contract-query/*`, `src/core/services/identity-resolution/*`, `docs/adr/ADR-001-plugin-architecture.md`, `docs/adr/ADR-008-smart-contract-plugin-implementation-strategy.md`, `docs/adr/ADR-009-class-based-handler-and-hook-architecture.md`

## Context

[SaucerSwap](https://www.saucerswap.finance/) is the leading decentralized exchange (DEX) on the Hedera network, implementing a Uniswap V2-style constant-product AMM. The CLI already supports generic smart contract interactions via the `contract`, `contract-erc20`, and `contract-erc721` plugins, but these require users to manually construct `ContractFunctionParameters` and know the exact Solidity function signatures. For DEX operations — which involve multi-step workflows (token association, spender allowance, pool creation, liquidity management, swaps) — a dedicated plugin with domain-specific commands significantly reduces friction and error potential.

The SaucerSwap V1 protocol exposes its functionality through two on-chain contracts and a public REST API:

| Component                | Mainnet ID                                                                                                 | Purpose                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **SaucerSwapV1RouterV3** | `0.0.3045981`                                                                                              | All write operations: pool creation, add/remove liquidity, swaps       |
| **UniswapV2Factory**     | `0.0.2895920`                                                                                              | Pool existence checks (`getPair`), pool creation fee (`pairCreateFee`) |
| **WHBAR**                | `0.0.1456986`                                                                                              | Wrapped HBAR token used when HBAR is one side of a pair                |
| **SaucerSwap REST API**  | `https://api.saucerswap.finance/pools/` (mainnet) / `https://test-api.saucerswap.finance/pools/` (testnet) | Read-only pool listing with metadata                                   |

This ADR proposes a `saucerswap` plugin that wraps these contracts and API into seven CLI commands, reusing existing core services (`ContractTransactionService`, `ContractQueryService`, `IdentityResolutionService`, `TxSignService`, `TxExecuteService`) without requiring any core framework changes.

Reference documentation: [SaucerSwap V1 Developer Docs](https://docs.saucerswap.finance/v/developer/saucerswap-v1/).

## Decision

### Part 1: Plugin Structure

The plugin is located at `src/plugins/saucerswap/` and exposes seven commands. It does not define any hooks.

```
src/plugins/saucerswap/
├── index.ts
├── manifest.ts
├── constants.ts
├── utils/
│   ├── saucerswap-api.ts
│   ├── hbar-detection.ts
│   ├── slippage.ts
│   └── deadline.ts
├── commands/
│   ├── create-pool/
│   │   ├── handler.ts
│   │   ├── index.ts
│   │   ├── input.ts
│   │   ├── output.ts
│   │   └── types.ts
│   ├── deposit/
│   │   ├── handler.ts
│   │   ├── index.ts
│   │   ├── input.ts
│   │   ├── output.ts
│   │   └── types.ts
│   ├── withdraw/
│   │   ├── handler.ts
│   │   ├── index.ts
│   │   ├── input.ts
│   │   ├── output.ts
│   │   └── types.ts
│   ├── swap/
│   │   ├── handler.ts
│   │   ├── index.ts
│   │   ├── input.ts
│   │   ├── output.ts
│   │   └── types.ts
│   ├── buy/
│   │   ├── handler.ts
│   │   ├── index.ts
│   │   ├── input.ts
│   │   ├── output.ts
│   │   └── types.ts
│   ├── list/
│   │   ├── handler.ts
│   │   ├── index.ts
│   │   └── output.ts
│   └── view/
│       ├── handler.ts
│       ├── index.ts
│       ├── input.ts
│       └── output.ts
└── __tests__/
    └── unit/
```

### Part 2: Network-Specific Constants

`src/plugins/saucerswap/constants.ts` stores contract IDs and API URLs per network:

```ts
import { SupportedNetwork } from '@/core/types/shared.types';

export interface SaucerSwapNetworkConfig {
  routerContractId: string;
  factoryContractId: string;
  whbarTokenId: string;
  whbarEvmAddress: string;
  apiBaseUrl: string;
}

export const SAUCERSWAP_CONFIG: Partial<
  Record<SupportedNetwork, SaucerSwapNetworkConfig>
> = {
  [SupportedNetwork.MAINNET]: {
    routerContractId: '0.0.3045981',
    factoryContractId: '0.0.2895920', // UniswapV2Factory
    whbarTokenId: '0.0.1456986',
    whbarEvmAddress: '0x0000000000000000000000000000000000163b5a',
    apiBaseUrl: 'https://api.saucerswap.finance',
  },
  [SupportedNetwork.TESTNET]: {
    routerContractId: 'TBD',
    factoryContractId: 'TBD',
    whbarTokenId: 'TBD',
    whbarEvmAddress: 'TBD',
    apiBaseUrl: 'https://test-api.saucerswap.finance',
  },
};

export const DEFAULT_SWAP_GAS = 250_000;
export const DEFAULT_LIQUIDITY_GAS = 240_000;
export const DEFAULT_CREATE_POOL_GAS = 3_200_000;
export const DEFAULT_REMOVE_LIQUIDITY_GAS = 2_800_000;
export const DEFAULT_DEADLINE_SECONDS = 180;
export const DEFAULT_SLIPPAGE_PERCENT = 0.5;
```

### Part 3: HBAR Detection and Routing

A core design concern is that SaucerSwap uses different Solidity functions depending on whether one of the tokens is HBAR (represented as WHBAR on-chain). The plugin automatically detects this and routes to the correct function variant.

```ts
// src/plugins/saucerswap/utils/hbar-detection.ts
export function isHbar(tokenIdOrAlias: string): boolean {
  const normalized = tokenIdOrAlias.toUpperCase();
  return normalized === 'HBAR';
}
```

This detection affects which Solidity function is called:

| Operation          | Both tokens are HTS        | One token is HBAR                                  |
| ------------------ | -------------------------- | -------------------------------------------------- |
| Create pool        | `addLiquidityNewPool`      | `addLiquidityETHNewPool`                           |
| Deposit            | `addLiquidity`             | `addLiquidityETH`                                  |
| Withdraw           | `removeLiquidity`          | `removeLiquidityETH`                               |
| Swap (exact input) | `swapExactTokensForTokens` | `swapExactETHForTokens` or `swapExactTokensForETH` |
| Buy (exact output) | `swapTokensForExactTokens` | `swapETHForExactTokens` or `swapTokensForExactETH` |

### Part 4: Slippage and Deadline Utilities

```ts
// src/plugins/saucerswap/utils/slippage.ts
export function computeMinOutput(
  amount: bigint,
  slippagePercent: number,
): bigint {
  // Use 10000n for basis points (0.01%) to avoid floating point errors with BigInt
  const slippageBps = BigInt(Math.floor(slippagePercent * 100));
  return (amount * (10000n - slippageBps)) / 10000n;
}

// src/plugins/saucerswap/utils/deadline.ts
export function computeDeadline(secondsFromNow: number): number {
  return Math.floor(Date.now() / 1000) + secondsFromNow;
}
```

### Part 5: SaucerSwap REST API Client

`src/plugins/saucerswap/utils/saucerswap-api.ts` provides a typed client for the public pool listing endpoint.

```ts
import { z } from 'zod';

const ApiTokenSchema = z.object({
  decimals: z.number(),
  id: z.string(),
  name: z.string(),
  symbol: z.string(),
  priceUsd: z.number(),
});

const ApiLPTokenSchema = z.object({
  decimals: z.number(),
  id: z.string(),
  name: z.string(),
  symbol: z.string(),
  priceUsd: z.string(),
});

const ApiLiquidityPoolSchema = z.object({
  id: z.number(),
  contractId: z.string(),
  lpToken: ApiLPTokenSchema,
  lpTokenReserve: z.string(),
  tokenA: ApiTokenSchema,
  tokenReserveA: z.string(),
  tokenB: ApiTokenSchema,
  tokenReserveB: z.string(),
});

export type ApiLiquidityPool = z.infer<typeof ApiLiquidityPoolSchema>;

export async function fetchAllPools(
  apiBaseUrl: string,
): Promise<ApiLiquidityPool[]> {
  const response = await fetch(`${apiBaseUrl}/pools/`);
  if (!response.ok)
    throw new NetworkError(`SaucerSwap API error: ${response.status}`);
  const data = await response.json();
  return z.array(ApiLiquidityPoolSchema).parse(data);
}
```

### Part 6: Commands

#### 6.1 Create Pool

`SaucerSwapCreatePoolCommand` extends `BaseTransactionCommand` (ADR-009). It creates a new liquidity pool with initial liquidity.

**Solidity functions:**

- HBAR/token: `addLiquidityETHNewPool(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline)` — payable, includes pool creation fee in `msg.value`
- Token/token: `addLiquidityNewPool(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline)` — payable, pool creation fee in `msg.value`

**CLI options:**

| Option          | Short | Type   | Required | Description                                 |
| --------------- | ----- | ------ | -------- | ------------------------------------------- |
| `--token-a`     | `-a`  | STRING | yes      | First token (Hedera ID, alias, or `HBAR`)   |
| `--token-b`     | `-b`  | STRING | yes      | Second token (Hedera ID, alias, or `HBAR`)  |
| `--amount-a`    |       | STRING | yes      | Desired amount of token A (human-readable)  |
| `--amount-b`    |       | STRING | yes      | Desired amount of token B (human-readable)  |
| `--slippage`    | `-s`  | NUMBER | no       | Slippage tolerance in % (default: 0.5)      |
| `--deadline`    | `-d`  | NUMBER | no       | Deadline in seconds from now (default: 180) |
| `--gas`         | `-g`  | NUMBER | no       | Gas limit (default: 3,200,000)              |
| `--key-manager` | `-k`  | STRING | no       | Key manager                                 |

**Handler flow:**

```ts
export class SaucerSwapCreatePoolCommand extends BaseTransactionCommand<...> {
  async normalizeParams(args: CommandHandlerArgs): Promise<CreatePoolNormalizedParams> {
    const validArgs = CreatePoolInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();
    const config = getSaucerSwapConfig(network);

    // Resolve token EVM addresses via identity resolution
    const tokenAEvm = await resolveTokenEvmAddress(api, validArgs.tokenA, network);
    const tokenBEvm = await resolveTokenEvmAddress(api, validArgs.tokenB, network);
    const recipientEvm = await resolveOperatorEvmAddress(api, network);

    // Detect HBAR involvement
    const hbarSide = detectHbarSide(validArgs.tokenA, validArgs.tokenB, config);

    // Fetch pool creation fee from Factory contract (pairCreateFee)
    const poolCreationFeeHbar = await fetchPoolCreationFee(api, config);

    // Compute min amounts from slippage
    const amountAMin = computeMinOutput(validArgs.amountA, validArgs.slippage);
    const amountBMin = computeMinOutput(validArgs.amountB, validArgs.slippage);

    return { config, hbarSide, tokenAEvm, tokenBEvm, recipientEvm, poolCreationFeeHbar, ... };
  }

  async buildTransaction(args, params): Promise<BuildTransactionResult> {
    if (params.hbarSide !== null) {
      // addLiquidityETHNewPool — the non-HBAR token + amounts + recipient + deadline
      const functionParameters = new ContractFunctionParameters()
        .addAddress(params.htsTokenEvm)
        .addUint256(params.htsAmountDesired)
        .addUint256(params.htsAmountMin)
        .addUint256(params.hbarAmountMin)
        .addAddress(params.recipientEvm)
        .addUint256(params.deadline);

      const result = api.contract.contractExecuteTransaction({
        contractId: params.config.routerContractId,
        gas: params.gas,
        functionName: 'addLiquidityETHNewPool',
        functionParameters,
        payableAmount: params.hbarAmountIn + params.poolCreationFeeHbar,
      });
      return { transaction: result.transaction };
    } else {
      // addLiquidityNewPool — tokenA + tokenB + amounts + recipient + deadline
      const functionParameters = new ContractFunctionParameters()
        .addAddress(params.tokenAEvm)
        .addAddress(params.tokenBEvm)
        .addUint256(params.amountADesired)
        .addUint256(params.amountBDesired)
        .addUint256(params.amountAMin)
        .addUint256(params.amountBMin)
        .addAddress(params.recipientEvm)
        .addUint256(params.deadline);

      const result = api.contract.contractExecuteTransaction({
        contractId: params.config.routerContractId,
        gas: params.gas,
        functionName: 'addLiquidityNewPool',
        functionParameters,
        payableAmount: params.poolCreationFeeHbar,
      });
      return { transaction: result.transaction };
    }
  }
  // signTransaction, executeTransaction, outputPreparation follow BaseTransactionCommand pattern
}
```

**Pre-checks (documented in ADR, enforced by SaucerSwap contract):**

1. Pool must not already exist — the contract reverts with `POOL ALREADY EXISTS` if it does.
2. Router contract must have spender allowance for HTS tokens.
3. Client account's max token auto-association should be increased by one to receive the LP token.

CLI usage:

```
hcli saucerswap create-pool --token-a HBAR --token-b 0.0.2000 --amount-a 100 --amount-b 50000 --slippage 1
hcli saucerswap create-pool --token-a 0.0.2000 --token-b 0.0.3000 --amount-a 1000 --amount-b 2000
```

#### 6.2 Deposit (Add Liquidity)

`SaucerSwapDepositCommand` extends `BaseTransactionCommand`. Adds liquidity to an **existing** pool.

**Solidity functions:**

- HBAR/token: `addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline)` — gas ~240,000
- Token/token: `addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline)` — gas ~240,000

**CLI options:** Same as `create-pool` except default gas is 240,000 and no pool creation fee is included.

CLI usage:

```
hcli saucerswap deposit --token-a HBAR --token-b 0.0.2000 --amount-a 10 --amount-b 5000
hcli saucerswap deposit --token-a 0.0.2000 --token-b 0.0.3000 --amount-a 100 --amount-b 200
```

**Pre-checks:**

1. LP token must be associated to the client account.
2. Router contract must have spender allowance for the input HTS tokens.

#### 6.3 Withdraw (Remove Liquidity)

`SaucerSwapWithdrawCommand` extends `BaseTransactionCommand`. Removes liquidity from an existing pool.

**Solidity functions:**

- HBAR/token: `removeLiquidityETH(address token, uint liquidity, uint amountTokenMin, uint amountETHMin, address to, uint deadline)` — gas ~2,800,000
- Token/token: `removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline)` — gas ~1,600,000

**CLI options:**

| Option           | Short | Type   | Required | Description                     |
| ---------------- | ----- | ------ | -------- | ------------------------------- |
| `--token-a`      | `-a`  | STRING | yes      | First token                     |
| `--token-b`      | `-b`  | STRING | yes      | Second token                    |
| `--liquidity`    | `-l`  | STRING | yes      | LP token amount to remove       |
| `--min-amount-a` |       | STRING | no       | Minimum token A to receive      |
| `--min-amount-b` |       | STRING | no       | Minimum token B to receive      |
| `--deadline`     | `-d`  | NUMBER | no       | Deadline seconds (default: 180) |
| `--gas`          | `-g`  | NUMBER | no       | Gas limit (default: 2,800,000)  |
| `--key-manager`  | `-k`  | STRING | no       | Key manager                     |

**Pre-checks:** Router contract must have spender allowance for the LP token.

CLI usage:

```
hcli saucerswap withdraw --token-a HBAR --token-b 0.0.2000 --liquidity 1000000
hcli saucerswap withdraw --token-a 0.0.2000 --token-b 0.0.3000 --liquidity 500000
```

#### 6.4 Swap (Exact Input)

`SaucerSwapSwapCommand` extends `BaseTransactionCommand`. Swaps an exact amount of input token for at least a minimum amount of output token.

**Solidity functions (selected by HBAR detection):**

| Input | Output | Function                                                                                                |
| ----- | ------ | ------------------------------------------------------------------------------------------------------- |
| HBAR  | Token  | `swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline)`                   |
| Token | HBAR   | `swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline)`    |
| Token | Token  | `swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline)` |

**CLI options:**

| Option          | Short | Type   | Required | Description                                |
| --------------- | ----- | ------ | -------- | ------------------------------------------ |
| `--from`        | `-f`  | STRING | yes      | Input token (Hedera ID, alias, or `HBAR`)  |
| `--to`          | `-t`  | STRING | yes      | Output token                               |
| `--amount`      | `-a`  | STRING | yes      | Exact input amount (human-readable)        |
| `--min-output`  |       | STRING | no       | Minimum output amount (overrides slippage) |
| `--slippage`    | `-s`  | NUMBER | no       | Slippage % (default: 0.5)                  |
| `--deadline`    | `-d`  | NUMBER | no       | Deadline seconds (default: 180)            |
| `--gas`         | `-g`  | NUMBER | no       | Gas limit (default: 250,000)               |
| `--key-manager` | `-k`  | STRING | no       | Key manager                                |

**Path construction:** The `path` parameter is an ordered array of EVM addresses. For a direct swap: `[fromEvmAddress, toEvmAddress]`. When HBAR is involved, the WHBAR EVM address is used in the path.

**Handler flow (simplified):**

```ts
async buildTransaction(args, params): Promise<BuildTransactionResult> {
  const path = [params.fromEvmAddress, params.toEvmAddress];
  const deadline = computeDeadline(params.deadlineSeconds);

  if (params.fromIsHbar) {
    // swapExactETHForTokens — payable, HBAR sent as msg.value
    const functionParameters = new ContractFunctionParameters()
      .addUint256(params.amountOutMin)
      .addAddressArray(path)
      .addAddress(params.recipientEvm)
      .addUint256(deadline);

    const result = api.contract.contractExecuteTransaction({
      contractId: params.config.routerContractId,
      gas: params.gas,
      functionName: 'swapExactETHForTokens',
      functionParameters,
      payableAmount: params.amountIn,
    });
    return { transaction: result.transaction };
  } else if (params.toIsHbar) {
    // swapExactTokensForETH
    const functionParameters = new ContractFunctionParameters()
      .addUint256(params.amountIn)
      .addUint256(params.amountOutMin)
      .addAddressArray(path)
      .addAddress(params.recipientEvm)
      .addUint256(deadline);

    return api.contract.contractExecuteTransaction({
      contractId: params.config.routerContractId,
      gas: params.gas,
      functionName: 'swapExactTokensForETH',
      functionParameters,
    });
  } else {
    // swapExactTokensForTokens
    const functionParameters = new ContractFunctionParameters()
      .addUint256(params.amountIn)
      .addUint256(params.amountOutMin)
      .addAddressArray(path)
      .addAddress(params.recipientEvm)
      .addUint256(deadline);

    return api.contract.contractExecuteTransaction({
      contractId: params.config.routerContractId,
      gas: params.gas,
      functionName: 'swapExactTokensForTokens',
      functionParameters,
    });
  }
}
```

**Pre-checks:**

1. Output token must be associated to the recipient account.
2. Router contract must have spender allowance for the input token (when input is not HBAR).

CLI usage:

```
hcli saucerswap swap --from HBAR --to 0.0.2000 --amount 10 --slippage 1
hcli saucerswap swap --from 0.0.2000 --to 0.0.3000 --amount 500 --min-output 480
hcli saucerswap swap --from 0.0.2000 --to HBAR --amount 1000
```

#### 6.5 Buy (Exact Output)

`SaucerSwapBuyCommand` extends `BaseTransactionCommand`. The inverse of `swap` — the user specifies the **exact output** amount they want to receive, and the command computes the maximum input.

**Solidity functions:**

| Input | Output | Function                                                                                                |
| ----- | ------ | ------------------------------------------------------------------------------------------------------- |
| HBAR  | Token  | `swapETHForExactTokens(uint amountOut, address[] path, address to, uint deadline)`                      |
| Token | HBAR   | `swapTokensForExactETH(uint amountOut, uint amountInMax, address[] path, address to, uint deadline)`    |
| Token | Token  | `swapTokensForExactTokens(uint amountOut, uint amountInMax, address[] path, address to, uint deadline)` |

**CLI options:**

| Option          | Short | Type   | Required | Description                           |
| --------------- | ----- | ------ | -------- | ------------------------------------- |
| `--from`        | `-f`  | STRING | yes      | Input token                           |
| `--to`          | `-t`  | STRING | yes      | Output token                          |
| `--amount`      | `-a`  | STRING | yes      | Exact output amount desired           |
| `--max-input`   |       | STRING | yes      | Maximum input amount willing to spend |
| `--deadline`    | `-d`  | NUMBER | no       | Deadline seconds (default: 180)       |
| `--gas`         | `-g`  | NUMBER | no       | Gas limit (default: 250,000)          |
| `--key-manager` | `-k`  | STRING | no       | Key manager                           |

CLI usage:

```
hcli saucerswap buy --from HBAR --to 0.0.2000 --amount 5000 --max-input 15
hcli saucerswap buy --from 0.0.2000 --to HBAR --amount 10 --max-input 6000
```

#### 6.6 List Pools

`SaucerSwapListCommand` implements the `Command` interface directly (no transaction). It queries the SaucerSwap public REST API and optionally filters by a token.

**CLI options:**

| Option    | Short | Type   | Required | Description                                         |
| --------- | ----- | ------ | -------- | --------------------------------------------------- |
| `--token` | `-t`  | STRING | no       | Filter pools that contain this token (ID or symbol) |

**Handler flow:**

```ts
export class SaucerSwapListCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const validArgs = SaucerSwapListInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();
    const config = getSaucerSwapConfig(network);

    const pools = await fetchAllPools(config.apiBaseUrl);

    const filtered = validArgs.token
      ? pools.filter(
          (p) =>
            p.tokenA.id === validArgs.token ||
            p.tokenB.id === validArgs.token ||
            p.tokenA.symbol.toUpperCase() === validArgs.token.toUpperCase() ||
            p.tokenB.symbol.toUpperCase() === validArgs.token.toUpperCase() ||
            p.tokenA.name
              .toUpperCase()
              .includes(validArgs.token.toUpperCase()) ||
            p.tokenB.name.toUpperCase().includes(validArgs.token.toUpperCase()),
        )
      : pools;

    return {
      result: {
        network,
        poolCount: filtered.length,
        pools: filtered.map((p) => ({
          id: p.id,
          contractId: p.contractId,
          tokenA: `${p.tokenA.symbol} (${p.tokenA.id})`,
          tokenB: `${p.tokenB.symbol} (${p.tokenB.id})`,
          reserveA: p.tokenReserveA,
          reserveB: p.tokenReserveB,
        })),
      },
    };
  }
}
```

**Human-readable output template:**

```handlebars
Found
{{poolCount}}
pool(s) on
{{network}}
{{#each pools}}
  Pool #{{this.id}}:
  {{this.tokenA}}
  /
  {{this.tokenB}}
  Contract:
  {{this.contractId}}
  Reserves:
  {{this.reserveA}}
  /
  {{this.reserveB}}
{{/each}}
```

CLI usage:

```
hcli saucerswap list
hcli saucerswap list --token 0.0.2000
hcli saucerswap list --token SAUCE
```

#### 6.7 View Pool

`SaucerSwapViewCommand` implements the `Command` interface directly. It shows detailed information about a specific pool identified by its two tokens.

**CLI options:**

| Option      | Short | Type   | Required | Description  |
| ----------- | ----- | ------ | -------- | ------------ |
| `--token-a` | `-a`  | STRING | yes      | First token  |
| `--token-b` | `-b`  | STRING | yes      | Second token |

**Data sources:**

1. SaucerSwap REST API — pool metadata, LP token info, price.
2. Factory `getPair(tokenA, tokenB)` via `api.contractQuery.queryContractFunction()` — confirms on-chain existence.
3. Pair `getReserves()` via `api.contractQuery.queryContractFunction()` — live reserve data.

**Output includes:** pool contract ID, LP token ID, token A/B symbols, reserves, price ratio, LP token total supply.

CLI usage:

```
hcli saucerswap view --token-a HBAR --token-b 0.0.2000
hcli saucerswap view --token-a 0.0.2000 --token-b 0.0.3000
```

### Part 7: Command Classification

| Command       | Base Class               | On-Chain Effect                           | SaucerSwap Contract Function                     |
| ------------- | ------------------------ | ----------------------------------------- | ------------------------------------------------ |
| `create-pool` | `BaseTransactionCommand` | Creates pool + deposits initial liquidity | `addLiquidityETHNewPool` / `addLiquidityNewPool` |
| `deposit`     | `BaseTransactionCommand` | Adds liquidity to existing pool           | `addLiquidityETH` / `addLiquidity`               |
| `withdraw`    | `BaseTransactionCommand` | Removes liquidity from existing pool      | `removeLiquidityETH` / `removeLiquidity`         |
| `swap`        | `BaseTransactionCommand` | Swaps exact input for minimum output      | `swapExact*For*` variants                        |
| `buy`         | `BaseTransactionCommand` | Swaps maximum input for exact output      | `swap*ForExact*` variants                        |
| `list`        | `Command`                | None (REST API query)                     | N/A                                              |
| `view`        | `Command`                | None (REST API + JSON RPC query)          | Factory `getPair` + Pair `getReserves`           |

## Execution Flow

### Swap Lifecycle

```mermaid
sequenceDiagram
    participant User
    participant CLI
    participant SwapCmd as SaucerSwapSwapCommand
    participant IdRes as IdentityResolutionService
    participant ContractSvc as ContractTransactionService
    participant TxSign as TxSignService
    participant TxExec as TxExecuteService
    participant Network as Hedera Network
    participant Router as SaucerSwapV1RouterV3

    User->>CLI: saucerswap swap --from HBAR --to 0.0.2000 --amount 10
    CLI->>SwapCmd: execute(args)
    SwapCmd->>SwapCmd: normalizeParams(args)
    SwapCmd->>IdRes: resolveContract(0.0.2000) → evmAddress
    SwapCmd->>SwapCmd: detect HBAR → use swapExactETHForTokens
    SwapCmd->>SwapCmd: compute amountOutMin, deadline, path

    SwapCmd->>SwapCmd: buildTransaction(args, params)
    SwapCmd->>ContractSvc: contractExecuteTransaction(routerId, gas, fn, params)
    ContractSvc-->>SwapCmd: ContractExecuteTransaction

    SwapCmd->>TxSign: sign(transaction, [])
    TxSign-->>SwapCmd: signedTransaction

    SwapCmd->>TxExec: execute(signedTransaction)
    TxExec->>Network: submit ContractExecuteTransaction
    Network->>Router: swapExactETHForTokens(amountOutMin, path, to, deadline)
    Router-->>Network: amounts[]
    Network-->>TxExec: TransactionResult
    TxExec-->>SwapCmd: result

    SwapCmd->>SwapCmd: outputPreparation
    SwapCmd-->>User: Swap completed (txId, amounts)
```

### Command-to-Contract Mapping

```mermaid
flowchart LR
  subgraph cli [CLI Commands]
    CP[create-pool]
    DEP[deposit]
    WD[withdraw]
    SW[swap]
    BUY[buy]
    LIST[list]
    VIEW[view]
  end

  subgraph router [SaucerSwapV1RouterV3]
    ALNP["addLiquidity*NewPool"]
    AL["addLiquidity*"]
    RL["removeLiquidity*"]
    SFT["swapExact*For*"]
    SFE["swap*ForExact*"]
  end

  subgraph readonly [Read-Only]
    API["SaucerSwap REST /pools/"]
    GP["Factory.getPair()"]
    GR["Pair.getReserves()"]
  end

  CP --> ALNP
  DEP --> AL
  WD --> RL
  SW --> SFT
  BUY --> SFE
  LIST --> API
  VIEW --> API
  VIEW --> GP
  VIEW --> GR
```

## Pros and Cons

### Pros

- **No core changes required.** The plugin reuses existing `ContractTransactionService`, `ContractQueryService`, `IdentityResolutionService`, `TxSignService`, and `TxExecuteService`. No new core service interfaces are introduced.
- **Domain-specific UX.** Users interact with high-level concepts (swap, deposit, withdraw) rather than raw Solidity function names and hex-encoded parameters. The plugin handles HBAR/WHBAR routing, slippage computation, deadline calculation, and path construction automatically.
- **Follows established patterns.** Write commands extend `BaseTransactionCommand` (ADR-009), read-only commands implement `Command` directly. The file structure mirrors `contract-erc20` and other existing plugins.
- **Testable.** Each command handler is independently unit-testable by mocking `api.contract`, `api.identityResolution`, and `api.contractQuery`, following the same test patterns as `contract-erc20`.
- **Typed API responses.** The SaucerSwap REST API responses are parsed with Zod schemas, catching API changes at parse time rather than at runtime.

### Cons

- **External API dependency.** The `list` and `view` commands depend on SaucerSwap's public REST API (`api.saucerswap.finance`), which may have rate limits, downtime, or schema changes. The plugin should handle API errors gracefully with informative messages.
- **Network-specific configuration.** Contract IDs differ between mainnet, testnet, and localnet. Testnet IDs may not be available or may change. The plugin must validate that configuration exists for the current network before executing.
- **Gas estimation.** Recommended gas values are hardcoded based on SaucerSwap documentation. Actual gas requirements may vary for tokens with custom fees. Users can override with `--gas`.
- **Token decimal handling.** The plugin must correctly convert human-readable amounts to smallest-unit integers using each token's decimal places (fetched via `api.mirror.getTokenInfo` or `contract-erc20 decimals`). Incorrect conversion leads to unexpected swap amounts.
- **Pre-check responsibility.** Token association and spender allowance must be handled by the user before invoking SaucerSwap commands. The plugin does not automatically associate tokens or approve allowances — these are separate CLI commands (`token associate`, `contract-erc20 approve`).

## Consequences

- A new plugin directory `src/plugins/saucerswap/` is created with the structure described above.
- The plugin manifest is registered in `src/core/shared/config/cli-options.ts` `DEFAULT_PLUGIN_STATE` array.
- No changes to existing core services or interfaces are needed.
- Commands that produce transactions (`create-pool`, `deposit`, `withdraw`, `swap`, `buy`) are compatible with the batch and schedule hooks via `registeredHooks: ['batchify', 'scheduled']` in the manifest.
- Users must ensure token associations and spender allowances are in place before using the plugin. Documentation should include common prerequisite commands.
- The `constants.ts` file must be updated when testnet contract IDs are determined.
- Multi-hop swap routing and custom-fee token variants (`*SupportingFeeOnTransferTokens`) can be added as future enhancements without changing the command structure.

## Testing Strategy

- **Unit: SaucerSwapSwapCommand phases.** Test `normalizeParams` with HBAR→Token, Token→HBAR, and Token→Token inputs; verify correct Solidity function selection and path construction. Test `buildTransaction` produces correct `ContractFunctionParameters`. Mock `api.contract.contractExecuteTransaction` and verify function name, contract ID, and gas are correct.
- **Unit: SaucerSwapBuyCommand phases.** Same as swap but verify "exact output" function variants (`swap*ForExact*`) are selected and `amountInMax` / `amountOut` are correctly placed in parameters.
- **Unit: SaucerSwapCreatePoolCommand.** Verify pool creation fee is included in payable amount. Verify HBAR/token vs token/token routing.
- **Unit: SaucerSwapDepositCommand.** Verify `addLiquidity` vs `addLiquidityETH` routing. Verify slippage computation produces correct `amountMin` values.
- **Unit: SaucerSwapWithdrawCommand.** Verify `removeLiquidity` vs `removeLiquidityETH` routing. Verify LP amount and minimum output amounts are correctly passed.
- **Unit: SaucerSwapListCommand.** Mock `fetchAllPools` and verify filtering by token ID and symbol. Verify empty result handling.
- **Unit: SaucerSwapViewCommand.** Mock REST API response and contract queries (`getPair`, `getReserves`). Verify output includes reserves, price ratio, LP token info.
- **Unit: HBAR detection.** Test `isHbar` with `HBAR`, `hbar`, WHBAR token ID, and regular token IDs.
- **Unit: Slippage and deadline utilities.** Test `computeMinOutput` with various amounts and slippage percentages. Test `computeDeadline` produces correct Unix timestamp.
- **Unit: SaucerSwap REST API client.** Mock `fetch` responses and verify Zod schema parsing. Verify error handling for non-200 responses.
- **Unit: Constants.** Verify config exists for mainnet. Verify `getSaucerSwapConfig` throws `ConfigurationError` for unsupported networks.
- **Integration: Swap lifecycle.** With mocked network, verify full flow from CLI args through `normalizeParams` → `buildTransaction` → `signTransaction` → `executeTransaction` → `outputPreparation`.
