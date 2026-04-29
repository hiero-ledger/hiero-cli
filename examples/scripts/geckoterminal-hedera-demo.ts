// npx ts-node examples/scripts/geckoterminal-hedera-demo.ts
//
// Before running: verify pool address at https://www.geckoterminal.com/hedera/pools
// Search for WHBAR/USDC on SaucerSwap V2 and copy the pool address below.

const NETWORK = 'hedera-hashgraph';
const POOL_ADDRESS = '0xC5B707348dA504E9Be1bD4E21525459830e7B11d'; // SaucerSwap WHBAR/USDC (higher liquidity pool, created 2023-11-17)

const BASE_URL = 'https://api.geckoterminal.com/api/v2';

interface PoolTxnWindow {
  buys: number;
  sells: number;
  buyers: number;
  sellers: number;
}

interface PoolAttributes {
  name: string;
  base_token_price_usd: string;
  reserve_in_usd: string;
  fdv_usd: string;
  market_cap_usd: string | null;
  volume_usd: { m5: string; h1: string; h6: string; h24: string };
  price_change_percentage: { m5: string; h1: string; h6: string; h24: string };
  transactions: {
    m5: PoolTxnWindow;
    h1: PoolTxnWindow;
    h6: PoolTxnWindow;
    h24: PoolTxnWindow;
  };
  pool_created_at: string;
}

interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function usd(value: string | null): string {
  if (!value) return 'N/A';
  return `$${Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function pct(value: string): string {
  const n = Number(value);
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

async function fetchOrThrow(url: string): Promise<unknown> {
  const res = await fetch(url).catch((err: unknown) => {
    console.error('Fetch failed:', err);
    process.exit(1);
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`GeckoTerminal responded with ${res.status}: ${body}`);
    process.exit(1);
  }
  return res.json();
}

function printPool(attrs: PoolAttributes): void {
  const created = attrs.pool_created_at.slice(0, 10);
  const t24 = attrs.transactions.h24;
  const t1 = attrs.transactions.h1;

  console.log(`\n=== GeckoTerminal: ${attrs.name} ===`);
  console.log(
    `Price USD    : $${Number(attrs.base_token_price_usd).toFixed(6)}`,
  );
  console.log(`Reserve USD  : ${usd(attrs.reserve_in_usd)}`);
  console.log(`FDV          : ${usd(attrs.fdv_usd)}`);
  console.log(`Market Cap   : ${usd(attrs.market_cap_usd)}`);
  console.log(`Volume 24h   : ${usd(attrs.volume_usd.h24)}`);
  console.log(`Volume 1h    : ${usd(attrs.volume_usd.h1)}`);
  console.log(`Price Δ 24h  : ${pct(attrs.price_change_percentage.h24)}`);
  console.log(`Price Δ 1h   : ${pct(attrs.price_change_percentage.h1)}`);
  console.log(
    `Txns 24h     : ${t24.buys} buys / ${t24.sells} sells (${t24.buyers} unique buyers / ${t24.sellers} sellers)`,
  );
  console.log(`Txns 1h      : ${t1.buys} buys / ${t1.sells} sells`);
  console.log(`Pool created : ${created}`);
}

function printOhlcvSummary(candles: Candle[]): void {
  if (candles.length === 0) {
    console.log('\nOHLCV 24h summary: no data');
    return;
  }
  const high = Math.max(...candles.map((c) => c.high));
  const low = Math.min(...candles.map((c) => c.low));
  const range = low > 0 ? (((high - low) / low) * 100).toFixed(2) : 'N/A';

  console.log('\nOHLCV 24h summary (hourly):');
  console.log(`  High : $${high.toFixed(6)}`);
  console.log(`  Low  : $${low.toFixed(6)}`);
  console.log(`  Range: ${range}%`);
  console.log(`  Candles: ${candles.length}`);
}

async function main(): Promise<void> {
  const poolRes = (await fetchOrThrow(
    `${BASE_URL}/networks/${NETWORK}/pools/${POOL_ADDRESS}`,
  )) as { data: { attributes: PoolAttributes } };

  printPool(poolRes.data.attributes);

  const ohlcvRes = (await fetchOrThrow(
    `${BASE_URL}/networks/${NETWORK}/pools/${POOL_ADDRESS}/ohlcv/hour?aggregate=1&limit=24`,
  )) as { data: { attributes: { ohlcv_list: number[][] } } };

  const candles: Candle[] = ohlcvRes.data.attributes.ohlcv_list.map(
    ([timestamp, open, high, low, close, volume]) => ({
      timestamp,
      open,
      high,
      low,
      close,
      volume,
    }),
  );

  printOhlcvSummary(candles);
}

main();
