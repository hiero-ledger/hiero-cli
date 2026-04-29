# Hedera DEX Data Sources for hiero-cli Portfolio Agent

## DexScreener vs GeckoTerminal — Pick One

---

## TL;DR

Two viable single-source options for fetching Hedera DEX data (SaucerSwap V1/V2) in a stateless Node.js/TypeScript CLI without API keys. **Pick one, not both.**

- **DexScreener:** Snapshot-oriented. ~300 req/min. No OHLCV, but rich windowed metrics (5m/1h/6h/24h) including buy/sell transaction counts. Flat, easy schema.
- **GeckoTerminal:** History-oriented. 30 req/min. Full OHLCV (1m–1d, up to ~6 months) and a dedicated trades endpoint. JSON:API-style nested schema.

**Lean towards DexScreener** for a one-shot CLI portfolio agent. The `spawn → fetch → decide → exit` lifecycle and a capital-allocation agent both reward snapshot richness and high rate-limit headroom over historical depth. GeckoTerminal's biggest advantage (OHLCV history) is largely wasted when re-fetched every invocation with no persistent cache.

---

## 1. Context

- **CLI flow:** Each invocation is one-shot. No daemon, no cron, no persistent storage between runs.
- **Hard constraint:** Zero API keys.
- **Consumer:** Portfolio/allocation agent for HBAR, SAUCE, USDC, Bonzo lending positions, SaucerSwap LP. Decisions are about **where to put capital and how much**, not when to scalp the next 1m candle.
- **Out of scope here:** On-chain truth (Hedera Mirror Node) and lending state (Bonzo Data API) — both are key-free and used regardless of which DEX adapter is chosen. This doc covers the DEX market-data layer only.

---

## 2. Approach A — DexScreener

### What you get per call

- Spot price (USD, native)
- Liquidity (USD, base, quote)
- FDV, market cap
- 5m / 1h / 6h / 24h windows for: price change %, volume, **transaction counts split into buys vs sells**
- Pool creation timestamp (`pairCreatedAt`) — useful as a risk signal
- All pairs across DEXes for a token (`saucerswap`, `saucerswap-v2`)
- Token profiles, boost data (paid-promotion signals — proxy for hype/marketing flow)
- Search by symbol or name

### What you don't get

- OHLCV candles
- Trades list (only aggregated counts)
- Historical data beyond the four rolling windows

### Implementation sketch (hiero-cli patterns)

```typescript
// src/plugins/portfolio/services/dexscreener/dexscreener-service.interface.ts

export interface DexScreenerPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: { address: string; symbol: string };
  quoteToken: { address: string; symbol: string };
  priceUsd: string;
  priceNative: string;
  liquidity: { usd: number; base: number; quote: number };
  volume: { m5: number; h1: number; h6: number; h24: number };
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  priceChange: { m5: number; h1: number; h6: number; h24: number };
  fdv: number;
  marketCap: number;
  pairCreatedAt: number;
}

export interface DexScreenerService {
  getPair(chainId: string, pairAddress: string): Promise<DexScreenerPair>;
  getTokenPairs(
    chainId: string,
    tokenAddress: string,
  ): Promise<DexScreenerPair[]>;
  search(query: string): Promise<DexScreenerPair[]>;
}
```

```typescript
// src/plugins/portfolio/services/dexscreener/dexscreener-service.ts
import { NetworkError } from '@/core/errors/network-error';

import type {
  DexScreenerPair,
  DexScreenerService,
} from './dexscreener-service.interface';

const BASE_URL = 'https://api.dexscreener.com/latest/dex';

export class DexScreenerServiceImpl implements DexScreenerService {
  async getPair(
    chainId: string,
    pairAddress: string,
  ): Promise<DexScreenerPair> {
    const res = await this.fetchOrThrow(
      `${BASE_URL}/pairs/${chainId}/${pairAddress}`,
    );
    const { pairs } = res as { pairs: DexScreenerPair[] };
    return pairs[0];
  }

  async getTokenPairs(
    chainId: string,
    tokenAddress: string,
  ): Promise<DexScreenerPair[]> {
    const res = await this.fetchOrThrow(`${BASE_URL}/tokens/${tokenAddress}`);
    const { pairs } = res as { pairs: DexScreenerPair[] };
    return (pairs ?? []).filter((p) => p.chainId === chainId);
  }

  async search(query: string): Promise<DexScreenerPair[]> {
    const res = await this.fetchOrThrow(
      `${BASE_URL}/search?q=${encodeURIComponent(query)}`,
    );
    const { pairs } = res as { pairs: DexScreenerPair[] };
    return pairs ?? [];
  }

  private async fetchOrThrow(url: string): Promise<unknown> {
    const res = await fetch(url).catch((err: unknown) => {
      throw new NetworkError('DexScreener request failed', { cause: err });
    });
    if (!res.ok)
      throw new NetworkError(`DexScreener responded with ${res.status}`);
    return res.json();
  }
}
```

```typescript
// src/plugins/portfolio/commands/snapshot/handler.ts
import type {
  Command,
  CommandHandlerArgs,
  CommandResult,
} from '@/core/commands';

import { SnapshotInputSchema } from './input';
import type { SnapshotOutput } from './output';

export class SnapshotCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { token } = SnapshotInputSchema.parse(args.args);
    const dex = args.api.portfolio.dexScreener; // injected via CoreApi / plugin CoreApi extension

    const pairs = await dex.getTokenPairs('hedera', token);

    return { result: { pairs } satisfies SnapshotOutput };
  }
}

export async function snapshotCommand(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new SnapshotCommand().execute(args);
}
```

### Pros

- **High rate-limit headroom** (~300 req/min) — comfortably tracks dozens of pairs per CLI run.
- **Flat, predictable schema** — minimal parsing, fewer edge cases.
- **Buy/sell transaction split out of the box** — strong signal for flow analysis without extra calls.
- **Fast CLI runs** — typically a single HTTP call covers all pairs of one token.
- **Multi-chain ready** — same schema for ~100 chains; expanding beyond Hedera is a config change.
- **Token boost/profile data** — niche but useful as a "is this being marketed?" signal.

### Cons

- **No OHLCV** — cannot compute classical TA indicators (RSI, MACD, Bollinger, ATR).
- **No trades list** — whale detection must come from on-chain (Mirror Node logs) instead.
- **Only four time windows** — cannot answer "what was the 7-day high?" without another source.
- **EVM address required** — Hedera HTS IDs (`0.0.xxxxx`) need to be mapped once to EVM hex (static `tokenMap.ts` in the plugin).

---

## 3. Approach B — GeckoTerminal

### What you get per call

- Spot price, liquidity, FDV, market cap (similar to DexScreener)
- Volume and price change windows: m5, h1, h6, h24
- Transaction counts including **unique buyers/sellers** per window
- **OHLCV candles**: timeframes `minute`, `hour`, `day` with aggregations (1m, 5m, 15m, 1h, 4h, 12h, 1d), max 1000 candles per call, ~6 months of history
- **Trades endpoint**: last 300 trades over 24h per pool, filterable by USD size (native whale-trade detection)
- Trending pools, new pools, top pools per network
- Token info: top 3 pools, market_cap_usd, total reserve in USD

### What you don't get

- Flat schema — JSON:API nesting (`data.attributes.*`) requires more unwrapping
- Marketing/boost signals (no equivalent to DexScreener boosts)

### Implementation sketch (hiero-cli patterns)

```typescript
// src/plugins/portfolio/services/geckoterminal/geckoterminal-service.interface.ts

export type OhlcvTimeframe = 'minute' | 'hour' | 'day';

export interface PoolAttributes {
  name: string;
  base_token_price_usd: string;
  reserve_in_usd: string;
  fdv_usd: string;
  market_cap_usd: string | null;
  volume_usd: { m5: string; h1: string; h6: string; h24: string };
  price_change_percentage: { m5: string; h1: string; h6: string; h24: string };
  transactions: {
    m5: { buys: number; sells: number; buyers: number; sellers: number };
    h1: { buys: number; sells: number; buyers: number; sellers: number };
    h6: { buys: number; sells: number; buyers: number; sellers: number };
    h24: { buys: number; sells: number; buyers: number; sellers: number };
  };
  pool_created_at: string;
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface GeckoTerminalService {
  getPool(network: string, poolAddress: string): Promise<PoolAttributes>;
  getTokenPools(
    network: string,
    tokenAddress: string,
  ): Promise<PoolAttributes[]>;
  getOHLCV(
    network: string,
    poolAddress: string,
    timeframe: OhlcvTimeframe,
    aggregate?: number,
    limit?: number,
  ): Promise<Candle[]>;
  getTrades(
    network: string,
    poolAddress: string,
    minUsd?: number,
  ): Promise<unknown[]>;
}
```

```typescript
// src/plugins/portfolio/services/geckoterminal/geckoterminal-service.ts
import { NetworkError } from '@/core/errors/network-error';

import type {
  Candle,
  GeckoTerminalService,
  OhlcvTimeframe,
  PoolAttributes,
} from './geckoterminal-service.interface';

const BASE_URL = 'https://api.geckoterminal.com/api/v2';

type GeckoPoolResponse = { data: { attributes: PoolAttributes }[] };
type GeckoOhlcvResponse = { data: { attributes: { ohlcv_list: number[][] } } };

export class GeckoTerminalServiceImpl implements GeckoTerminalService {
  async getPool(network: string, poolAddress: string): Promise<PoolAttributes> {
    const res = await this.fetchOrThrow(
      `${BASE_URL}/networks/${network}/pools/${poolAddress}`,
    );
    return (res as { data: { attributes: PoolAttributes } }).data.attributes;
  }

  async getTokenPools(
    network: string,
    tokenAddress: string,
  ): Promise<PoolAttributes[]> {
    const res = await this.fetchOrThrow(
      `${BASE_URL}/networks/${network}/tokens/${tokenAddress}/pools`,
    );
    return (res as GeckoPoolResponse).data.map((d) => d.attributes);
  }

  async getOHLCV(
    network: string,
    poolAddress: string,
    timeframe: OhlcvTimeframe,
    aggregate = 1,
    limit = 100,
  ): Promise<Candle[]> {
    const url = `${BASE_URL}/networks/${network}/pools/${poolAddress}/ohlcv/${timeframe}?aggregate=${aggregate}&limit=${limit}`;
    const res = await this.fetchOrThrow(url);
    return (res as GeckoOhlcvResponse).data.attributes.ohlcv_list.map(
      ([timestamp, open, high, low, close, volume]) => ({
        timestamp,
        open,
        high,
        low,
        close,
        volume,
      }),
    );
  }

  async getTrades(
    network: string,
    poolAddress: string,
    minUsd = 0,
  ): Promise<unknown[]> {
    const qs = minUsd > 0 ? `?trade_volume_in_usd_greater_than=${minUsd}` : '';
    const res = await this.fetchOrThrow(
      `${BASE_URL}/networks/${network}/pools/${poolAddress}/trades${qs}`,
    );
    return (res as { data: unknown[] }).data;
  }

  private async fetchOrThrow(url: string): Promise<unknown> {
    const res = await fetch(url).catch((err: unknown) => {
      throw new NetworkError('GeckoTerminal request failed', { cause: err });
    });
    if (!res.ok)
      throw new NetworkError(`GeckoTerminal responded with ${res.status}`);
    return res.json();
  }
}
```

### Pros

- **Full OHLCV** with up to ~6 months of history per pool — enables real volatility math, drawdowns from N-day highs, support/resistance, momentum-over-time.
- **Native trades endpoint with USD-size filter** — clean whale detection without parsing on-chain logs.
- **Unique buyer/seller counts** — finer-grained than DexScreener's plain buy/sell counts (helps distinguish "many small buyers" vs "one whale rebuying").
- **Multi-chain ready** — same coverage as DexScreener (~100 networks).
- **Trending and new pools endpoints** — useful regime/discovery signals.

### Cons

- **30 req/min hard cap** — major bottleneck. Tracking 10 pools = 1 pool-data call + 10 OHLCV calls = ⅓ of the per-minute budget per CLI invocation.
- **JSON:API-style nesting** (`data.attributes.*`) — more unwrapping vs DexScreener's flat shape.
- **OHLCV is wasted in stateless CLI** — every invocation re-downloads the same candles because there's no cross-run cache. You pay the rate-limit cost for data that didn't change.
- **Slower CLI runs** — multiple sequential calls per pool; each call ~200–500 ms.
- **No marketing signal** — no boost/profile equivalent.

---

## 4. Side-by-Side Comparison

| Dimension                                  | DexScreener                         | GeckoTerminal                          |
| ------------------------------------------ | ----------------------------------- | -------------------------------------- |
| **API key required**                       | No                                  | No                                     |
| **Rate limit**                             | ~300 req/min                        | 30 req/min                             |
| **Hedera support**                         | Yes (`chainId: hedera`)             | Yes (`network: hedera`)                |
| **SaucerSwap V1 + V2**                     | Yes (`saucerswap`, `saucerswap-v2`) | Yes                                    |
| **Multi-chain coverage**                   | ~100 chains                         | ~100 chains                            |
| **Schema style**                           | Flat                                | JSON:API nested                        |
| **Spot price + liquidity + FDV**           | Yes                                 | Yes                                    |
| **Time windows for volume / price change** | 5m, 1h, 6h, 24h                     | 5m, 1h, 6h, 24h                        |
| **Buy/sell transaction split**             | Yes (counts)                        | Yes (counts + unique buyers/sellers)   |
| **OHLCV candles**                          | No                                  | Yes (1m–1d, up to ~6 mo, max 1000)     |
| **Native trades list / whale detection**   | No                                  | Yes (last 300 in 24h, USD-filterable)  |
| **Trending/new pools**                     | Yes (boosts/profiles)               | Yes (trending/new)                     |
| **Token marketing signal**                 | Yes (boosts)                        | No                                     |
| **Typical CLI run latency**                | ~300–500 ms (1 call)                | ~600 ms – 2 s (multiple calls)         |
| **Fits stateless CLI flow**                | Excellent                           | Awkward (history wasted without cache) |
| **Fits portfolio-manager mental model**    | Excellent                           | Good                                   |
| **Fits day-trader/TA mental model**        | Poor                                | Excellent                              |

---

## 5. Why DexScreener Fits Better for This Use Case

A portfolio-management agent reasons in terms of:

- _Where is capital flowing right now?_ → buy/sell pressure, volume delta, liquidity delta
- _How risky is the position?_ → pool age, holder concentration (from Mirror Node), health factor (from Bonzo)
- _What's the regime?_ → 24h price change of HBAR, broader Hedera TVL trend (from DefiLlama)

All of these are **point-in-time** questions. None require a 90-day candle series. DexScreener delivers them in one call with 10× the rate-limit budget.

GeckoTerminal's killer feature — OHLCV history — is exactly the feature that pairs poorly with a stateless CLI: you'd re-fetch hundreds of candles every invocation, burn through the 30 req/min cap, and slow down every command, all to get data that the agent will mostly ignore when making allocation decisions.

The one scenario where GeckoTerminal would clearly win: **a TA-driven agent** that opens/closes positions based on RSI/MACD/Bollinger signals on intraday candles. That's a different product than a portfolio manager.

---

## 6. Decision Rule

| If the agent...                                                | Pick                                                                          |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Allocates capital across assets, manages risk, optimizes yield | **DexScreener**                                                               |
| Trades on technical indicators / chart patterns                | **GeckoTerminal**                                                             |
| Needs whale-trade detection but no TA                          | DexScreener (use Mirror Node logs for whales)                                 |
| Needs to compute multi-day volatility                          | GeckoTerminal — _or_ DexScreener + DefiLlama daily prices as a workaround     |
| Will eventually run as a long-lived service with caching       | Either; GeckoTerminal becomes much more attractive once candles can be cached |

---

## 7. Suggested Plugin Layout (hiero-cli structure)

```
src/plugins/portfolio/
├── manifest.ts
├── commands/
│   └── snapshot/
│       ├── handler.ts
│       ├── input.ts
│       ├── output.ts
│       └── index.ts
├── services/
│   ├── dexscreener/
│   │   ├── dexscreener-service.interface.ts
│   │   └── dexscreener-service.ts
│   ├── geckoterminal/               # whichever is chosen — or both behind a unified interface
│   │   ├── geckoterminal-service.interface.ts
│   │   └── geckoterminal-service.ts
│   ├── mirrornode-portfolio.ts      # thin wrapper over HederaMirrornodeService
│   ├── bonzo.ts                     # lending: APY, health factor
│   └── defillama.ts                 # TVL, fees, daily prices (key-free)
├── utils/
│   └── token-map.ts                 # static 0.0.xxxxx ↔ EVM hex for known tokens
├── types.ts
└── schema.ts
```

**Notes on integration:**

- Both services follow the `*-service.interface.ts` / `*-service.ts` split and are injected via constructor.
- `NetworkError` (from `@/core/errors/`) is thrown on any HTTP failure — consistent with the rest of the CLI error hierarchy.
- `token-map.ts` maps Hedera HTS IDs (`0.0.xxxxx`) to EVM hex addresses required by both APIs — kept in the plugin, not in `@/core/shared/constants.ts` (too domain-specific).
- Portfolio snapshot commands are read-only → `Command` interface, not `BaseTransactionCommand`.
- No `any` — all `res.json()` calls cast to typed response shapes with `as`.
