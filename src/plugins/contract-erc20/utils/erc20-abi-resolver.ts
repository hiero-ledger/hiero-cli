import { Interface } from 'ethers';

const ERC20_VIEW_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

export function getAbiErc20Interface(): Interface {
  return new Interface(ERC20_VIEW_ABI);
}
