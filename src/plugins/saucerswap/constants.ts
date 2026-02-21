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

export type SupportedSaucerSwapNetwork = 'mainnet' | 'testnet';

export function getQuoterId(network: string): string {
  return network === 'testnet'
    ? SAUCERSWAP_QUOTER_TESTNET
    : SAUCERSWAP_QUOTER_MAINNET;
}
export function getRouterId(network: string): string {
  return network === 'testnet'
    ? SAUCERSWAP_ROUTER_TESTNET
    : SAUCERSWAP_ROUTER_MAINNET;
}
export function getWhbarTokenId(network: string): string {
  return network === 'testnet' ? WHBAR_TOKEN_TESTNET : WHBAR_TOKEN_MAINNET;
}

/** Default pool fee tier: 0.05% = 500 (0x0001F4) */
export const DEFAULT_POOL_FEE_TIER = 500;

export const QUOTER_ABI = [
  'function quoteExactInput(bytes path, uint256 amountIn) external returns (uint256 amountOut, uint160[] sqrtPriceX96AfterList, uint32[] initializedTicksCrossedList, uint256 gasEstimate)',
];

export const ROUTER_ABI = [
  'function exactInput((bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)',
];
