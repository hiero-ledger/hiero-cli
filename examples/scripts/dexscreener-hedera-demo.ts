// npx ts-node examples/scripts/dexscreener-hedera-demo.ts

const CHAIN_ID = 'hedera';
const WHBAR_EVM = '0x0000000000000000000000000000000000163B5A'; // 0.0.1456986 — verify
const USDC_EVM = '0x000000000000000000000000000000000006F89A'; // 0.0.456858  — verify

const BASE_URL = 'https://api.dexscreener.com/latest/dex';

interface DexScreenerTxns {
  buys: number;
  sells: number;
}

interface DexScreenerPair {
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
    m5: DexScreenerTxns;
    h1: DexScreenerTxns;
    h6: DexScreenerTxns;
    h24: DexScreenerTxns;
  };
  priceChange: { m5: number; h1: number; h6: number; h24: number };
  fdv: number;
  marketCap: number;
  pairCreatedAt: number;
}

function usd(value: number): string {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function pct(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function printPair(pair: DexScreenerPair): void {
  const created = new Date(pair.pairCreatedAt).toISOString().slice(0, 10);

  const shortAddr = `${pair.pairAddress.slice(0, 6)}...${pair.pairAddress.slice(-4)}`;
  console.log(
    `\n=== DexScreener: ${pair.baseToken.symbol}/${pair.quoteToken.symbol} (${pair.dexId} | ${shortAddr}) ===`,
  );
  console.log(`Price USD    : $${Number(pair.priceUsd).toFixed(6)}`);
  console.log(`Liquidity    : ${usd(pair.liquidity.usd)}`);
  console.log(`FDV          : ${usd(pair.fdv)}`);
  console.log(`Volume 24h   : ${usd(pair.volume.h24)}`);
  console.log(`Volume 1h    : ${usd(pair.volume.h1)}`);
  console.log(`Price Δ 24h  : ${pct(pair.priceChange.h24)}`);
  console.log(`Price Δ 1h   : ${pct(pair.priceChange.h1)}`);
  console.log(
    `Txns 24h     : ${pair.txns.h24.buys} buys / ${pair.txns.h24.sells} sells`,
  );
  console.log(
    `Txns 1h      : ${pair.txns.h1.buys} buys / ${pair.txns.h1.sells} sells`,
  );
  console.log(`Pool created : ${created}`);
  console.log(`Pair address : ${pair.pairAddress}`);
}

async function main(): Promise<void> {
  const res = await fetch(`${BASE_URL}/tokens/${WHBAR_EVM}`).catch(
    (err: unknown) => {
      console.error('Fetch failed:', err);
      process.exit(1);
    },
  );

  if (!res.ok) {
    console.error(`DexScreener responded with ${res.status}`);
    process.exit(1);
  }

  const { pairs } = (await res.json()) as { pairs: DexScreenerPair[] | null };
  const hedera = (pairs ?? []).filter((p) => p.chainId === CHAIN_ID);
  const whbarUsdc = hedera.filter(
    (p) => p.quoteToken.address.toLowerCase() === USDC_EVM.toLowerCase(),
  );

  if (whbarUsdc.length === 0) {
    console.log('No WHBAR/USDC pairs found on Hedera.');
    console.log(`All Hedera pairs for WHBAR (${hedera.length}):`);
    hedera.forEach((p) =>
      console.log(`  ${p.dexId}: ${p.baseToken.symbol}/${p.quoteToken.symbol}`),
    );
    return;
  }

  whbarUsdc.forEach(printPair);
}

main();
