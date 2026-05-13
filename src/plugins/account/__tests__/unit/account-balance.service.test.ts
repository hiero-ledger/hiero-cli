import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type { AccountNftInfo } from '@/core/services/mirrornode/types';

import { makeAliasMock, makeMirrorMock } from '@/__tests__/mocks/mocks';
import { MirrorNodeTokenType } from '@/core/services/mirrornode/types';
import { AliasType, SupportedNetwork } from '@/core/types/shared.types';
import { AccountBalanceServiceImpl } from '@/plugins/account/services/account-balance.service';

describe('AccountBalanceServiceImpl', () => {
  test('returns fungible token balances with metadata and display balance', async () => {
    const alias = makeAliasMock();
    alias.resolve.mockReturnValue({
      alias: 'token-a',
      type: AliasType.Token,
      network: SupportedNetwork.TESTNET,
      entityId: '0.0.7777',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    const mirror = makeMirrorMock({
      tokenBalances: [{ token_id: '0.0.7777', balance: 500 }],
      tokenInfo: {
        '0.0.7777': {
          name: 'Token A',
          symbol: 'TKA',
          decimals: '2',
        },
      },
    }) as HederaMirrornodeService;
    const service = new AccountBalanceServiceImpl(mirror, alias);

    const result = await service.fetchTokenBalances(
      '0.0.1234',
      undefined,
      false,
      SupportedNetwork.TESTNET,
    );

    expect(result).toEqual([
      {
        tokenId: '0.0.7777',
        name: 'Token A',
        symbol: 'TKA',
        alias: 'token-a',
        balance: 500n,
        balanceDisplay: '5',
        decimals: 2,
      },
    ]);
  });

  test('filters NFT token info from fungible token balances', async () => {
    const alias = makeAliasMock();
    const mirror = makeMirrorMock({
      tokenBalances: [{ token_id: '0.0.8888', balance: 1 }],
      tokenInfo: {
        '0.0.8888': {
          name: 'NFT A',
          symbol: 'NFTA',
          decimals: '0',
          type: MirrorNodeTokenType.NON_FUNGIBLE_UNIQUE,
        },
      },
    }) as HederaMirrornodeService;
    const service = new AccountBalanceServiceImpl(mirror, alias);

    const result = await service.fetchTokenBalances(
      '0.0.1234',
      undefined,
      false,
      SupportedNetwork.TESTNET,
    );

    expect(result).toBeUndefined();
  });

  test('returns grouped NFT balances with collection metadata', async () => {
    const alias = makeAliasMock();
    alias.resolve.mockReturnValue({
      alias: 'nft-a',
      type: AliasType.Token,
      network: SupportedNetwork.TESTNET,
      entityId: '0.0.9999',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    const nfts: AccountNftInfo[] = [
      {
        token_id: '0.0.9999',
        serial_number: 1,
        account_id: '0.0.1234',
        deleted: false,
      },
      {
        token_id: '0.0.9999',
        serial_number: 2,
        account_id: '0.0.1234',
        deleted: false,
      },
    ];
    const mirror = makeMirrorMock({
      nfts,
      tokenInfo: {
        '0.0.9999': {
          name: 'NFT A',
          symbol: 'NFTA',
          decimals: '0',
        },
      },
    }) as HederaMirrornodeService;
    const service = new AccountBalanceServiceImpl(mirror, alias);

    const result = await service.fetchNftBalances(
      '0.0.1234',
      undefined,
      SupportedNetwork.TESTNET,
    );

    expect(result).toEqual({
      collections: [
        {
          tokenId: '0.0.9999',
          name: 'NFT A',
          symbol: 'NFTA',
          alias: 'nft-a',
          serialNumbers: [1, 2],
          count: 2,
        },
      ],
      totalCount: 2,
      truncated: false,
    });
  });
});
