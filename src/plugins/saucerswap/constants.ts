/**
 * SaucerSwap V2 contract IDs and WHBAR token IDs.
 * Mainnet and testnet; plugin uses current network to select.
 */
export const SAUCERSWAP_QUOTER_MAINNET = '0.0.3949424';
export const SAUCERSWAP_ROUTER_MAINNET = '0.0.3949434';
export const WHBAR_TOKEN_MAINNET = '0.0.1456986';

/** Testnet: from https://docs.saucerswap.finance/developerx/contract-deployments */
export const SAUCERSWAP_QUOTER_TESTNET = '0.0.1390002';
export const SAUCERSWAP_ROUTER_TESTNET = '0.0.1414040';
export const WHBAR_TOKEN_TESTNET = '0.0.15058';
export const WHBAR_HELPER_MAINNET = '0.0.5808826';
export const WHBAR_HELPER_TESTNET = '0.0.5286055';

export type SupportedSaucerSwapNetwork = 'mainnet' | 'testnet';

/** SaucerSwap is only deployed on mainnet and testnet. */
const SAUCERSWAP_NETWORKS: SupportedSaucerSwapNetwork[] = [
  'mainnet',
  'testnet',
];

export function ensureSaucerSwapNetwork(
  network: string,
): SupportedSaucerSwapNetwork {
  const normalized = network.toLowerCase();
  if (SAUCERSWAP_NETWORKS.includes(normalized as SupportedSaucerSwapNetwork)) {
    return normalized as SupportedSaucerSwapNetwork;
  }
  throw new Error(
    `SaucerSwap is only supported on mainnet and testnet. Current network: ${network}. Use --network testnet or --network mainnet.`,
  );
}

export function getQuoterId(network: string): string {
  return ensureSaucerSwapNetwork(network) === 'testnet'
    ? SAUCERSWAP_QUOTER_TESTNET
    : SAUCERSWAP_QUOTER_MAINNET;
}
export function getRouterId(network: string): string {
  return ensureSaucerSwapNetwork(network) === 'testnet'
    ? SAUCERSWAP_ROUTER_TESTNET
    : SAUCERSWAP_ROUTER_MAINNET;
}
export function getWhbarTokenId(network: string): string {
  return ensureSaucerSwapNetwork(network) === 'testnet'
    ? WHBAR_TOKEN_TESTNET
    : WHBAR_TOKEN_MAINNET;
}
export function getWhbarHelperId(network: string): string {
  return ensureSaucerSwapNetwork(network) === 'testnet'
    ? WHBAR_HELPER_TESTNET
    : WHBAR_HELPER_MAINNET;
}

/**
 * Known token ID → contract ID for approve() (token→HBAR path).
 * On Hedera, token ID and ERC-20 proxy contract ID can differ (e.g. WHBAR).
 */
export const TOKEN_TO_CONTRACT: Record<string, Record<string, string>> = {
  testnet: {
    [WHBAR_TOKEN_TESTNET]: '0.0.15057', // WHBAR token 0.0.15058 → contract 0.0.15057
  },
  mainnet: {
    [WHBAR_TOKEN_MAINNET]: '0.0.1456985', // WHBAR token 0.0.1456986 → contract 0.0.1456985
  },
};

export function getTokenContractId(
  network: string,
  tokenId: string,
): string | undefined {
  const net = ensureSaucerSwapNetwork(network) as 'mainnet' | 'testnet';
  return TOKEN_TO_CONTRACT[net]?.[tokenId];
}

/** Default pool fee tier: 0.05% = 500 (0x0001F4) */
export const DEFAULT_POOL_FEE_TIER = 500;

/** Alternative fee tier: 0.30% = 3000 (0x000BB8); try when 0.05% pool does not exist */
export const POOL_FEE_TIER_30_BP = 3000;

export const QUOTER_ABI = [
  'function quoteExactInput(bytes path, uint256 amountIn) external returns (uint256 amountOut, uint160[] sqrtPriceX96AfterList, uint32[] initializedTicksCrossedList, uint256 gasEstimate)',
];

export const ROUTER_ABI = [
  'function exactInput((bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)',
  'function refundETH() external payable',
  'function multicall(bytes[] data) external payable returns (bytes[] results)',
];
