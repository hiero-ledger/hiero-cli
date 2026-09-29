import { SupportedNetwork } from '@/core/types/shared.types';
import { getExplorerUrl } from '@/core/utils/explorer-link';

describe('getExplorerUrl', () => {
  it('should point localnet at the local explorer', () => {
    expect(getExplorerUrl(SupportedNetwork.LOCALNET)).toBe(
      'http://localhost:38080/localnet',
    );
  });

  it('should point public networks at hashscan', () => {
    expect(getExplorerUrl(SupportedNetwork.TESTNET)).toBe(
      'https://hashscan.io/testnet',
    );
    expect(getExplorerUrl(SupportedNetwork.PREVIEWNET)).toBe(
      'https://hashscan.io/previewnet',
    );
    expect(getExplorerUrl(SupportedNetwork.MAINNET)).toBe(
      'https://hashscan.io/mainnet',
    );
  });
});
